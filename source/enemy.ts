import { GameObject } from "./gameobject.js";
import { Vector } from "./vector.js";
import { Bitmap, Flip, RenderTarget } from "./gfx.js";
import { ProgramComponents } from "./program.js";
import { BitmapIndex, Controls, SampleIndex } from "./mnemonics.js";
import { Platform } from "./platform.js";
import { Player } from "./player.js";
import { Rectangle } from "./rectangle.js";
import { Particle, spawnParticleExplosion } from "./particle.js";
import { FlyingText } from "./flyingtext.js";
import { nextExistingObject } from "./existingobject.js";


const CHAINBALL_DISTANCE : number = 32;

const MOVING_ENEMIES : boolean[] = [false, false, true, false, true, false, false, true];
const HARMFUL_ENEMIES : boolean[] = [false, false, false, false, false, true, true, true];
const IGNORE_ENEMY_COLLISION : boolean[] = [true, false, false, false, false, false, true, false];


const EATING_HEALTH : number = 1.0/4.0;
const EATING_POINTS : number = 100;
const STOMP_POINTS : number = 200;


export const enum EnemyType {

    Coin = 0, // Yes, coin is an enemy
    StaticBee = 1,
    MovingBee = 2,
    Slime = 3,
    Car = 4,
    Spikeball = 5,
    ChainBall = 6,
    MovingSpikeball = 7,
}


export class Enemy extends GameObject {


    private initialPos : Vector;

    private type : EnemyType = EnemyType.Coin;

    private frame : number = 0;
    private frameTimer : number = 0;
    private specialTimer : number = 0.0;
    private direction : number = 0;
    private deathTimer : number = 0.0;
    private sticky : boolean = false;

    private collisionBox : Rectangle;

    private specialFlip : Flip = Flip.None;

    private referencePlatform : Platform | undefined = undefined;


    constructor() {

        super(0, 0, false);

        this.initialPos = Vector.zero();

        this.collisionBox = new Rectangle(0, 0, 12, 12);
    }


    private die(baseSpeed : number, tick : number) : boolean {

        const deathSpeed : number = 1.0/15.0;

        this.deathTimer += deathSpeed*tick;
        this.frame = (this.deathTimer*4) | 0;

        this.pos.y += baseSpeed;

        return this.deathTimer >= 1.0;
    }


    private animate(frameTime : number, frameCount : number, tick : number) : void {

        this.frameTimer += tick;
        if (this.frameTimer >= frameTime) {

            this.frame = (this.frame + 1) % frameCount;
            this.frameTimer -= frameTime;
        }
    }


    private checkWallCollision(x : number, collisionWidth : number, dir : number) : boolean {

        if (this.direction == dir &&
            (dir > 0 && this.pos.x + collisionWidth/2 > x) ||
            (dir < 0 && this.pos.x - collisionWidth/2 < x)) {

            this.pos.x = x - collisionWidth/2*dir;
            this.direction = -dir;
            this.speed.x = 0.0;

            return true;
        }
        return false;
    }


    private updateFloatingBody(amplitude : number, waveTime : number, tick : number) : void {

        const waveSpeed : number = Math.PI*2/waveTime;

        this.specialTimer = (this.specialTimer + waveSpeed*tick) % (Math.PI*2);
        this.pos.y = this.referencePlatform!.getY() - 24 + Math.sin(this.specialTimer)*amplitude;
    }


    private updateFlyingMovingObject(baseSpeed : number, isSpikeball : boolean, tick : number) : void {

        const FLY_SPEED : number = 0.50;
        const MINIMAL_MOVE_SPEED : number = 0.5;

        if (!isSpikeball) {

            const waveTime : number = 120 - baseSpeed*30;
            this.updateFloatingBody(4, waveTime, tick);
            this.animate(4, 2, tick);
        }
        else {

            this.pos.y = this.referencePlatform.getY() - 24;
        }

        this.checkWallCollision(16, 14, -1); 
        this.checkWallCollision(240, 14, 1);

        const speedMod : number = isSpikeball ? 0.5 : 1.0;

        this.speed.x = this.direction*speedMod*(MINIMAL_MOVE_SPEED + baseSpeed*FLY_SPEED);
        this.speedTarget.makeEqual(this.speed);
    }


    private updateSlime(tick : number) : void {

        this.pos.y = this.referencePlatform.getY() - 7;

        this.animate(8, 4, tick);
    }


    private updateCar(baseSpeed : number, tick : number) : void {

        const MOVE_SPEED : number = 0.5;
        const MINIMAL_MOVE_SPEED : number = 0.25;

        this.speed.x = this.direction*(MINIMAL_MOVE_SPEED + baseSpeed*MOVE_SPEED);
        this.speedTarget.makeEqual(this.speed);

        const px : number = (this.pos.x/16) | 0;
        if (!this.referencePlatform!.isGround(px - 2)) {

            this.checkWallCollision(px*16, 8, -1);
        }
        if (!this.referencePlatform!.isGround(px)) {

            this.checkWallCollision((px + 1)*16, 8, 1);
        }

        this.pos.y = this.referencePlatform.getY() - 7;

        this.animate(8, 2, tick);
    }


    private updateChainball(baseSpeed : number, tick : number) : void {

        const ROTATION_SPEED : number = Math.PI*2/120.0;

        this.specialTimer = (this.specialTimer + ROTATION_SPEED*tick) % (Math.PI*2);

        this.pos.x = this.initialPos.x + Math.cos(this.specialTimer)*this.direction*CHAINBALL_DISTANCE;
        this.pos.y = this.referencePlatform!.getY() + 8 + Math.sin(this.specialTimer)*CHAINBALL_DISTANCE;
    }
    

    private kill() : void {

        this.dying = true;
        this.deathTimer = 0.0;
        this.frame = 0;
    }


    private spawnFlyingText(points : number, flyingText : FlyingText[]) : void {

        nextExistingObject<FlyingText>(flyingText, FlyingText).spawn(this.pos.x, this.pos.y - 4, points);
    }


    private checkStompCollision(baseSpeed : number, player : Player, flyingText : FlyingText[], comp : ProgramComponents) : boolean {

        const STOMP_WIDTH : number = 28;
        const STOMP_YOFF : number = 12.0;
        const NEAR_MARGIN : number = 2.0;
        const FAR_MARGIN : number = 8.0;
        const MIN_SPEED : number = -1.0;

        if (this.sticky || this.type == EnemyType.Coin) {

            return false;
        }

        const ppos : Vector = player.getPosition();
        const pspeed : Vector = player.getSpeed();
        const top : number = this.pos.y - STOMP_YOFF;

        if (pspeed.y < MIN_SPEED || 
            ppos.x < this.pos.x - STOMP_WIDTH/2 || 
            ppos.x > this.pos.x + STOMP_WIDTH/2 ||
            ppos.y < top - NEAR_MARGIN*comp.tick ||
            ppos.y >= top + (FAR_MARGIN + Math.abs(pspeed.y))*comp.tick
            ) {

            return false;
        }

        const harmful : boolean = HARMFUL_ENEMIES[this.type];
        if (harmful) {

            player.hurt(1.0/4.0, comp);
        }
        else {

            this.kill();
            const points : number = player.addPoints(STOMP_POINTS);
            this.spawnFlyingText(points, flyingText);

            comp.audio.playSample(comp.assets.getSample(SampleIndex.Stomp), 0.80);
        }

        player.bounce(baseSpeed, harmful);

        return true;
    }


    private checkTongueCollision(player : Player, comp : ProgramComponents) : boolean {

        const HIT_RADIUS : number = 12;

        if (this.sticky || !player.isTongueActive() || player.getStickyObject() !== null) {

            return false;
        }

        if (this.pos.distanceTo(player.getTonguePosition()) < HIT_RADIUS) {

            player.setStickyObject(this);
            this.sticky = true;
            this.frame = 0;

            comp.audio.playSample(comp.assets.getSample(SampleIndex.GetStuck), 0.60);

            return true;
        }
        return false;
    }


    private followTongue(player : Player, particles : Particle[], flyingText : FlyingText[], comp : ProgramComponents) : void {

        if (!player.isTongueActive()) {

            if (HARMFUL_ENEMIES[this.type]) {

                player.hurt(1.0/5.0, comp);
                this.exists = false;
                spawnParticleExplosion(particles, this.pos, 16);
                return;
            }

            if (this.type == EnemyType.Coin) {

                comp.audio.playSample(comp.assets.getSample(SampleIndex.Coin), 0.60);

                const points : number = player.addCoin();
                this.spawnFlyingText(points, flyingText);

                this.kill();
            }
            else {

                const points : number = player.addPoints(EATING_POINTS);
                this.spawnFlyingText(points, flyingText);

                player.addHealth(EATING_HEALTH);

                this.exists = false;
                spawnParticleExplosion(particles, this.pos, 16);

                comp.audio.playSample(comp.assets.getSample(SampleIndex.Eat), 0.60);
            }

            return;
        }

        this.pos.makeEqual(player.getTonguePosition());
    }


    private drawStaticBee(canvas : RenderTarget, bmp : Bitmap) : void {

        canvas.drawBitmap(bmp, this.specialFlip, this.pos.x - 8, this.pos.y - 8,
            this.frame*16, 16, 16, 16);
    }


    private drawMovingBee(canvas : RenderTarget, bmp : Bitmap) : void {

        canvas.drawBitmap(bmp, this.specialFlip, this.pos.x - 8, this.pos.y - 8,
            this.frame*16, 16, 16, 16, 16, 16, 8, 8, -Math.PI/2*this.direction);
    }


    private drawSlime(canvas : RenderTarget, bmp : Bitmap) : void {

        canvas.drawBitmap(bmp, this.specialFlip, this.pos.x - 8, this.pos.y - 8,
            32 + this.frame*16, 16, 16, 16);
    }


    private drawCar(canvas : RenderTarget, bmp : Bitmap) : void {

        canvas.drawBitmap(bmp, (this.direction > 0 ? Flip.Horizontal : Flip.None) | this.specialFlip, 
            this.pos.x - 8, this.pos.y - 8,
            96 + this.frame*16, 16, 16, 16);
    }


    private drawCoin(canvas : RenderTarget, bmp : Bitmap) : void {

        canvas.drawBitmap(bmp, this.specialFlip, 
            this.pos.x - 8, this.pos.y - 8,
            this.frame*16, 32, 16, 16);
    }


    private drawSpikeBall(canvas : RenderTarget, bmp : Bitmap, chained : boolean, moving : boolean) : void {

        const CHAIN_COUNT : number = 6;

        if (chained && !this.sticky) {

            const distDelta : number = CHAINBALL_DISTANCE/CHAIN_COUNT;
            const c : number = this.direction*Math.cos(this.specialTimer);
            const s : number = Math.sin(this.specialTimer);

            for (let i : number = 0; i < CHAIN_COUNT; ++ i) {

                const distance : number = distDelta*i;

                const chainx : number = Math.round(this.initialPos.x + c*distance);
                const chainy : number = Math.round(this.referencePlatform!.getY() + 8 + s*distance);

                canvas.drawBitmap(bmp, Flip.None, chainx - 4, chainy - 4, 160, 16, 8, 8);
            }
        }

        const angle : number | undefined = moving ? -Math.PI/2*this.direction : undefined;

        canvas.drawBitmap(bmp, this.specialFlip, 
            this.pos.x - 16, this.pos.y - 16, 
            128, 16, 32, 32, 32, 32, 16, 16, angle);
    }


    public update(baseSpeed : number, comp : ProgramComponents) : void {

        if (!this.exists) {

            return;
        }

        if (this.dying) {

            if (this.die(baseSpeed, comp.tick)) {

                this.exists = false;
            }
            return;
        }

        if (this.sticky) {

            return;
        }

        switch (this.type) {

        case EnemyType.Coin:

            this.updateFloatingBody(2, 90, comp.tick);
            this.animate(7, 4, comp.tick);
            break;

        case EnemyType.StaticBee:
            
            this.updateFloatingBody(12, 160 - 40*baseSpeed, comp.tick);
            this.animate(4, 2, comp.tick);
            break;

        case EnemyType.MovingSpikeball:
        case EnemyType.MovingBee:

            this.updateFlyingMovingObject(baseSpeed, this.type == EnemyType.MovingSpikeball, comp.tick);
            break;

        case EnemyType.Slime:

            this.updateSlime(comp.tick);
            break;

        case EnemyType.Car:

            this.updateCar(baseSpeed, comp.tick);
            break;

        case EnemyType.Spikeball:

            this.updateFloatingBody(4, 150, comp.tick);
            break;

        case EnemyType.ChainBall:

            this.updateChainball(baseSpeed, comp.tick);
            break;

        default:
            break;
        }

        this.pos.y += baseSpeed*comp.tick;
        if (this.pos.y >= 192 + 48) {

            this.exists = false;
        }

        this.move(comp.tick);
    }   


    public draw(canvas : RenderTarget, bmp : Bitmap) : void {

        if (!this.exists) {

            return;
        }

        if (this.dying) {

            // TODO: Create "drawDeath" function
            canvas.drawBitmap(bmp, Flip.None, 
                this.pos.x - 16, 
                this.pos.y - 16, 
                this.frame*32, 
                48 + 32*Number(this.type != EnemyType.Coin), 
                32, 32);
            return;
        }

        this.specialFlip = this.sticky ? Flip.Vertical : Flip.None;

        switch (this.type) {

        case EnemyType.Coin:

            this.drawCoin(canvas, bmp);
            break;

        case EnemyType.StaticBee:
            
            this.drawStaticBee(canvas, bmp);
            break;

        case EnemyType.MovingBee:

            this.drawMovingBee(canvas, bmp);
            break;

        case EnemyType.Slime:

            this.drawSlime(canvas, bmp);
            break;

        case EnemyType.Car:

            this.drawCar(canvas, bmp);
            break;

        case EnemyType.Spikeball:
        case EnemyType.ChainBall:
        case EnemyType.MovingSpikeball:

            this.drawSpikeBall(canvas, bmp, 
                this.type == EnemyType.ChainBall,
                this.type == EnemyType.MovingSpikeball);
            break;

        default:
            break;
        }
    }


    public spawn(x : number, y : number, type : EnemyType, referencePlatform : Platform) : void {

        this.pos.setValues(x, y);
        this.initialPos.makeEqual(this.pos);
        this.type = type;

        this.speed.zero();
        this.speedTarget.zero();

        this.specialTimer = Math.random()*Math.PI*2;
        this.direction = Math.random() > 0.5 ? 1 : -1;

        this.referencePlatform = referencePlatform;

        this.frame = 0;
        this.frameTimer = 0.0;

        this.hitbox = new Rectangle(0, 2, 10, 10);
        this.collisionBox = new Rectangle(0, 0, 12, 12);
        
        switch (this.type) {

        case EnemyType.StaticBee:

            this.collisionBox.h = 24;
            break;

        case EnemyType.Coin:

            this.hitbox = new Rectangle(0, 0, 14, 14);
            // Fallthrough
        case EnemyType.Slime:

            this.frame = (Math.random()*4) | 0;
            break;

        case EnemyType.ChainBall:
            this.specialTimer = Math.PI/4 + (Math.random()*Math.PI/2);
            break;

        default:
            break;
        }

        this.sticky = false;
        this.exists = true;
        this.dying = false;
    }


    public playerCollision(player : Player, baseSpeed : number,
        particles : Particle[], flyingText : FlyingText[],
        comp : ProgramComponents) : boolean {

        if (!this.exists || !player.doesExist() 
            || this.dying || player.isDying() ||
            this.pos.y < -16) {

            return false;
        }

        if (this.sticky) {

            if (player.getStickyObject() === this) {
            
                this.followTongue(player, particles, flyingText, comp);
            }
            return false;
        }

        if (this.checkTongueCollision(player, comp)) {

            return false;
        }

        if (this.checkStompCollision(baseSpeed, player, flyingText, comp)) {

            return true;
        }

        if (this.overlay(player)) {

            // Coin gets collected
            if (this.type == EnemyType.Coin) {

                comp.audio.playSample(comp.assets.getSample(SampleIndex.Coin), 0.60);

                const points : number = player.addCoin();
                this.spawnFlyingText(points, flyingText);

                this.kill();
            }
            else {

                player.hurt(1.0/4.0, comp);
            }
            return true;
        }
        return false;
    }


    public enemyCollision(e : Enemy) : void {

        if (!this.exists || this.dying || this.sticky ||
            !e.exists || e.dying || e.sticky ||
            IGNORE_ENEMY_COLLISION[this.type] || IGNORE_ENEMY_COLLISION[e.type]) {

            return;
        }

        const overlay : boolean = Rectangle.overlayShifted(this.pos, this.collisionBox, e.pos, e.collisionBox);
        if (!overlay) {

            return;
        }

        if (MOVING_ENEMIES[this.type]) {

            this.direction = (this.pos.x < e.pos.x) ? -1 : 1;
            this.speed.x = Math.abs(this.speed.x)*this.direction;
            this.speedTarget.x = this.speed.x;

            this.pos.x += this.speed.x;
        }

        if (MOVING_ENEMIES[e.type]) {

            e.direction = (e.pos.x < this.pos.x) ? -1 : 1;
            e.speed.x = Math.abs(e.speed.x)*e.direction;
            e.speedTarget.x = e.speed.x;

            e.pos.x += e.speed.x;
        }
    }


    public isSticky() : boolean {

        return this.sticky;
    }
}
