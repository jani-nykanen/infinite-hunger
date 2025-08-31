import { Vector } from "./vector.js";
import { Assets } from "./assets.js";
import { Align, Bitmap, Flip, RenderTarget } from "./gfx.js";
import { ProgramComponents } from "./program.js";
import { BitmapIndex, Controls } from "./mnemonics.js";
import { approachValue } from "./utility.js";
import { ActionState, Controller, InputState } from "./controller.js";
import { Dust } from "./dust.js";
import { GameObject } from "./gameobject.js";
import { nextExistingObject } from "./existingobject.js";
import { Rectangle } from "./rectangle.js";
import { Stats } from "./stats.js";
import { Particle, spawnParticleExplosion } from "./particle.js";


const TONGUE_MAX_TIME : number = 16;
const TONGUE_LENGTH_FACTOR : number = 6;
const STOMP_MULTIPLIER_BASE : number = 0.5;
const HURT_TIME : number = 60;


export class Player extends GameObject {


    private frame : number = 0;
    private animationTimer : number = 0;
    private flip : Flip = Flip.None;
    private touchSurface : boolean = true;

    private jumpTimer : number = 0.0;
    private ledgeTimer : number = 0.0;
    private canDoubleJump : boolean = false;

    private tongueTimer : number = 0.0;
    private tongueOut : boolean = false;
    private tongueReturning : boolean = false;
    private stickyObject : GameObject | null = null;

    private dust : Dust[];
    private dustTimer : number = 0.0;

    private hurtTimer : number = 0;

    private stompMultiplier : number = 0;

    private readonly stats : Stats;
    private readonly particles : Particle[];


    constructor(x : number, y : number, stats : Stats, particles : Particle[]) {

        super(x, y, true);

        this.dust = new Array<Dust> ();

        this.hitbox = new Rectangle(0, 2, 8, 12);

        this.friction.x = 0.225;

        this.stats = stats;
        this.particles = particles;
    }


    private controlJumping(controller : Controller) : void {

        const JUMP_TIME : number = 20.0;
        const DOUBLE_JUMP_TIME : number = 14.0;

        const jumpButton : ActionState = controller.getAction(Controls.Jump);
        if (jumpButton.state == InputState.Pressed) {

            const canJumpNormally : boolean = this.ledgeTimer > 0.0;
            if (canJumpNormally || this.canDoubleJump) {  

                if (!canJumpNormally) {

                    this.canDoubleJump = false;
                }

                this.jumpTimer = canJumpNormally ? JUMP_TIME : DOUBLE_JUMP_TIME;
                this.touchSurface = false;
                this.ledgeTimer = 0.0;
            }
        }
        else if (this.jumpTimer > 0 && (jumpButton.state & InputState.DownOrPressed) == 0) {

            this.jumpTimer = 0.0;
        }
    }


    private controlTongue(controller : Controller) : void {

        const tongueButtonState : InputState = controller.getAction(Controls.Tongue).state;

        if (tongueButtonState == InputState.Pressed && !this.tongueOut) {

            this.tongueOut = true;
            this.tongueReturning = false;
            this.tongueTimer = 0.0;

            this.stickyObject = null;
        }
        else if (this.tongueTimer >= TONGUE_MAX_TIME/2 &&
            (tongueButtonState & InputState.DownOrPressed) == 0) {

            this.tongueReturning = true;
        }
    }


    private control(controller : Controller) : void {

        const RUN_SPEED : number = 1.75;
        const BASE_GRAVITY : number = 4.0;

        let moveDir : number = 0;
        const left : ActionState = controller.getAction(Controls.Left);
        const right : ActionState = controller.getAction(Controls.Right);
        const maxStamp : number = Math.max(left.timestamp, right.timestamp);

        let flipFlag : Flip = this.flip;

        if ((left.state & InputState.DownOrPressed) != 0 && left.timestamp >= maxStamp) {

            moveDir = -1;
            flipFlag = Flip.Horizontal;
        }
        else if ((right.state & InputState.DownOrPressed) != 0 && right.timestamp >= maxStamp) {

            moveDir = 1;
            flipFlag = Flip.None;
        }

        if (!this.tongueOut) {

            this.flip = flipFlag;
        }

        this.speedTarget.x = moveDir*RUN_SPEED;
        this.speedTarget.y = BASE_GRAVITY;

        this.controlJumping(controller);
        this.controlTongue(controller);
    }


    private animateSprite(start : number, end : number, frameTime : number, tick : number) : void {

        if (this.frame < start || this.frame > end) {

            this.frame = start;
            this.animationTimer = 0.0;
        }

        this.animationTimer += tick;
        if (this.animationTimer >= frameTime) {

            ++ this.frame;
            if (this.frame > end) {

                this.frame = start;
            }
            this.animationTimer = 0.0;
        }
    }


    private animate(tick : number) : void {

        const JUMP_ANIM_THRESHOLD : number = 0.5;
        const DOUBLE_JUMP_ANIMATION_MAX_SPEED : number = 1.0;

        if (!this.touchSurface) {

            if (!this.tongueOut &&
                !this.canDoubleJump && 
                this.speed.y < DOUBLE_JUMP_ANIMATION_MAX_SPEED) {

                this.animateSprite(6, 9, 4, tick);
                return;
            }

            let frame : number = 0;
            if (this.speed.y < -JUMP_ANIM_THRESHOLD) {

                frame = 4;
            }
            else if (this.speed.y > JUMP_ANIM_THRESHOLD) {

                frame = 5;
            }
            this.frame = frame;
            return;
        }

        const idle : boolean = Math.abs(this.speedTarget.x) < 0.01;
        if (idle) {

            this.frame = 0;
        }
        else {

            const frameTime : number = (12 - Math.abs(this.speed.x)*4) | 0;
            this.animateSprite(0, 3, frameTime, tick);
        }
    }


    private updateTimers(baseSpeed : number, tick : number) : void {

        if (this.hurtTimer > 0.0) {

            this.hurtTimer -= tick;
        }

        if (this.ledgeTimer > 0.0) {

            this.ledgeTimer -= tick;
        }

        if (this.jumpTimer > 0.0) {

            const jumpSpeed : number = -2.85 + baseSpeed;

            this.speed.y = jumpSpeed;
            this.jumpTimer -= tick;
        }

        if (this.tongueOut) {

            if (this.tongueReturning) {

                const returnSpeed : number = this.stickyObject !== null ? 0.67 : 1.0;

                this.tongueTimer -= returnSpeed*tick;
                if (this.tongueTimer <= 0.0) {

                    this.tongueOut = false;
                }
            }
            else {

                this.tongueTimer += tick;
                if (this.tongueTimer >= TONGUE_MAX_TIME) {

                    this.tongueTimer = TONGUE_MAX_TIME;
                    this.tongueReturning = true;
                }
            }
        }
    }


    private updateDust(baseSpeed : number, tick : number) : void {

        const DUST_TIME : number = 5.0;

        for (const d of this.dust) {

            d.update(baseSpeed, tick);
        }

        if (Math.abs(this.speed.x) < 0.01 && this.touchSurface) {

            this.dustTimer = 0.0;
            return;
        }

        this.dustTimer += tick;
        if (this.dustTimer >= DUST_TIME) {

            nextExistingObject<Dust>(this.dust, Dust).spawn(
                this.pos.x, 
                this.pos.y + 4, 
                1.0/45.0, 6);

            this.dustTimer -= DUST_TIME;
        }
    }


    private kill(comp : ProgramComponents) : void {

        spawnParticleExplosion(this.particles, this.pos, 32);

        this.exists = false;

        // TODO: Sound effect?
    }


    private checkWallCollisions() : void {

        const COLLISION_WIDTH : number = 8;

        // Body collision
        if (this.speed.x < 0.0 && this.pos.x < 16 + COLLISION_WIDTH/2) {

            this.pos.x = 16 + COLLISION_WIDTH/2;
            this.speed.x = 0.0;
        }
        else if (this.speed.x > 0.0 && this.pos.x > 240 - COLLISION_WIDTH/2) {

            this.pos.x = 240 - COLLISION_WIDTH/2;
            this.speed.x = 0.0;
        }

        if (this.tongueOut && !this.tongueReturning) {

            const dir : number = this.flip == Flip.None ? 1 : -1;
            const dx : number = this.pos.x + dir*this.tongueTimer*TONGUE_LENGTH_FACTOR;

            if ((dir < 0 && dx < 16) || (dir > 0 && dx > 240)) {

                this.tongueReturning = true;
            }
        }
    }


    private drawTongue(canvas : RenderTarget, bmp : Bitmap) : void {

        if (!this.tongueOut) {

            return;
        }

        const len : number = ((this.tongueTimer) | 0)*TONGUE_LENGTH_FACTOR;

        const dx : number = this.flip == Flip.None ? this.pos.x + 1 : this.pos.x - 1 - len + 8;
        const dy : number = this.pos.y - 1;

        canvas.drawBitmap(bmp, Flip.None, dx, dy, 0, 64, 8, 8, len - 8, 8);
        canvas.drawBitmap(bmp, this.flip, dx + (this.flip == Flip.None ? len : 0) - 8, dy, 8, 64, 8, 8);
    }


    public update(baseSpeed : number, comp : ProgramComponents) : void {

        if (!this.exists) { 

            // Needed for the shake event
            if (this.hurtTimer > 0) {

                this.hurtTimer -= comp.tick;
            }

            for (const d of this.dust) {

                d.update(baseSpeed, comp.tick);
            }
            return;
        }

        this.control(comp.controller);
        this.move(comp.tick);
        this.animate(comp.tick);
        this.updateTimers(baseSpeed, comp.tick);
        this.updateDust(baseSpeed, comp.tick);
        this.checkWallCollisions();

        this.touchSurface = false;

        if (this.pos.y > 192 + 8) {

            this.hurtTimer = HURT_TIME; // This enables shake
            this.kill(comp);
        }
    }


    public preDraw(canvas : RenderTarget) : void {

        if (this.hurtTimer > 0 && Math.floor(this.hurtTimer/4) % 2 == 0) {

            return;
        }

        for (const d of this.dust) {

            d.draw(canvas);
        }
    }


    public draw(canvas : RenderTarget, assets : Assets) : void {

        const bmpObjects : Bitmap = assets.getBitmap(BitmapIndex.GameObjects);
        const bmpBase : Bitmap = assets.getBitmap(BitmapIndex.Base);

        const dx : number = this.pos.x - 8;
        const dy : number = this.pos.y - 7;

        if (!this.exists ||
            (this.hurtTimer > 0 && Math.floor(this.hurtTimer/4) % 2 == 0)) {

            return;
        }

        // Body
        canvas.drawBitmap(bmpObjects, this.flip, dx, dy, this.frame*16, 0, 16, 16);

        // No face if spinning
        if (this.frame > 5) {

            return;
        }

        // Face
        let faceOffX : number = -this.flip*2;
        let faceOffY : number = 0;
        let faceMode : number = Number(this.tongueOut);
        if (!this.tongueOut) {

            if (this.frame == 4) {

                faceOffY = -1;
            }
            else if (this.frame == 5) {

                faceOffY = 1;
            }
        }
        canvas.drawBitmap(bmpBase, this.flip, 
            dx + 5 + faceOffX, dy + 3 + faceOffY, 
            56, 32 + faceMode*8, 8, 8);

        // Tongue
        this.drawTongue(canvas, bmpBase);
    }


    public postDraw(canvas : RenderTarget, assets : Assets) : void {

        const bmpFontOutlines : Bitmap = assets.getBitmap(BitmapIndex.FontOutlinesWhite);

        if (!this.exists || this.stompMultiplier == 0) {

            return;
        }

        canvas.setAlpha(0.75);
        canvas.drawText(bmpFontOutlines, 
            `+${(1.0 + this.stompMultiplier*STOMP_MULTIPLIER_BASE).toFixed(1)}`,
            this.pos.x, this.pos.y - 20, -9, 0, Align.Center);
        canvas.setAlpha();
    }


    public floorCollision(x : number, y : number, width : number, platformSpeed : number, tick : number) : boolean {

        const COLLISION_WIDTH : number = 8;
        const COLLISION_HEIGHT : number = 8;
        const SPEED_THRESHOLD : number = -0.25;

        const LEDGE_TIME : number = 8.0;

        const TOP_CHECK_AREA : number = 2.0;
        const BOTTOM_CHECK_AREA : number = 4.0;

        if (this.dying || !this.exists || this.speed.y < SPEED_THRESHOLD) {

            return false;
        }

        const left : number = this.pos.x - COLLISION_WIDTH/2;
        const right : number = this.pos.x + COLLISION_WIDTH/2;

        if (right < x || left >= x + width) {

            return false;
        }

        const bottom : number = this.pos.y + COLLISION_HEIGHT;
        const absSpeed : number = Math.abs(this.speed.y);

        if (bottom >= y - TOP_CHECK_AREA*tick && bottom <= y + (BOTTOM_CHECK_AREA + absSpeed)*tick) {

            this.pos.y = y - COLLISION_HEIGHT;
            this.speed.y = platformSpeed;

            this.ledgeTimer = LEDGE_TIME;
            this.touchSurface = true;
            this.canDoubleJump = true;

            this.stompMultiplier = 0;

            return true;
        }
        return false;
    }


    public spikeCollision(dx : number, dy : number, dw : number, dh : number, comp : ProgramComponents) : void {

        const DAMAGE : number = 1.0/4.0;

        if (this.dying || !this.exists || this.hurtTimer > 0) {

            return;
        }

        if (Rectangle.overlayShifted(this.pos, this.hitbox, new Vector(dx, dy), new Rectangle(0, 0, dw, dh))) {

            this.hurt(DAMAGE, comp);
        }
    }


    public bounce(harmful : boolean) : void {

        this.speed.y = -3.0;
        this.jumpTimer = 0.0;
        this.canDoubleJump = true;

        if (!harmful) {
        
            ++ this.stompMultiplier;
        }
    }


    public setStickyObject(o : GameObject) : void {

        this.stickyObject = o;
        this.tongueReturning = true;
    }


    public isTongueActive() : boolean {

        return this.tongueOut;
    }


    public getTonguePosition() : Vector {
        
        const dir : number = this.flip == Flip.None ? 1 : -1;
        const dx : number = this.pos.x + dir*this.tongueTimer*TONGUE_LENGTH_FACTOR;

        return new Vector(dx, this.pos.y);
    }


    public getStickyObject() : GameObject | null {

        return this.stickyObject;
    }


    public hurt(damage : number, comp : ProgramComponents) : void {

        if (this.hurtTimer > 0.0) {

            return;
        }

        this.hurtTimer = HURT_TIME;
        if (this.stats.visibleHealth <= 0.0) {

            this.kill(comp);
            return;
        }

        // TODO: Sound effect

        this.stats.updateHealth(-damage);

        this.stompMultiplier = 0;
    }


    public addCoins(amount : number) : void {

        const COIN_POINTS : number = 50;

        this.addPoints(COIN_POINTS);
        this.stats.coins += amount;
    }


    public addHealth(amount : number) : void {

        const STOMP_EAT_BONUS : number = 0.1;

        amount *= (1.0 + this.stompMultiplier*STOMP_EAT_BONUS);
        this.stats.updateHealth(amount);
    }


    public addPoints(amount : number) : void {

        this.stats.addPoints((amount*(1.0 + this.stompMultiplier*STOMP_MULTIPLIER_BASE)) | 0);
    }


    public getHurtTimer() : number {

        return this.hurtTimer/HURT_TIME;
    }
}