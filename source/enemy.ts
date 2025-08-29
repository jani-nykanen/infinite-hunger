import { GameObject } from "./gameobject.js";
import { Vector } from "./vector.js";
import { Bitmap, Flip, RenderTarget } from "./gfx.js";
import { ProgramComponents } from "./program.js";
import { BitmapIndex, Controls } from "./mnemonics.js";
import { Platform } from "./platform.js";


export const enum EnemyType {

    Coin = 0, // Yes, coin is an enemy
    StaticBee = 1,
    MovingBee = 2,
    Slime = 3,
    Car = 4,
}


export class Enemy extends GameObject {


    private type : EnemyType = EnemyType.Coin;

    private frame : number = 0;
    private frameTimer : number = 0;
    private waveTimer : number = 0.0;
    private direction : number = 0;

    private dying : boolean = false;

    private referencePlatform : Platform | undefined = undefined;


    constructor() {

        super(0, 0, false);
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


    private updateStaticBee(amplitude : number, waveTime : number, tick : number) : void {

        const waveSpeed : number = Math.PI*2/waveTime;

        this.waveTimer = (this.waveTimer + waveSpeed*tick) % (Math.PI*2);
        this.pos.y = this.referencePlatform!.getY() - 24 + Math.sin(this.waveTimer)*amplitude;

        this.animate(4, 2, tick);
    }


    private updateMovingBee(baseSpeed : number, tick : number) : void {

        const FLY_SPEED : number = 1.0;

        this.updateStaticBee(4, 90, tick);

        this.checkWallCollision(16, 14, -1); 
        this.checkWallCollision(240, 14, 1);

        this.speed.x = this.direction*baseSpeed*FLY_SPEED;
        this.speedTarget.makeEqual(this.speed);
    }


    private updateSlime(tick : number) : void {

        this.pos.y = this.referencePlatform.getY() - 7;

        this.animate(8, 4, tick);
    }


    private updateCar(baseSpeed : number, tick : number) : void {

        const MOVE_SPEED : number = 0.5;

        this.speed.x = this.direction*baseSpeed*MOVE_SPEED;
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


    private drawStaticBee(canvas : RenderTarget, bmp : Bitmap) : void {

        canvas.drawBitmap(bmp, Flip.None, this.pos.x - 8, this.pos.y - 8,
            this.frame*16, 16, 16, 16);
    }


    private drawMovingBee(canvas : RenderTarget, bmp : Bitmap) : void {

        canvas.drawBitmap(bmp, Flip.None, this.pos.x - 8, this.pos.y - 8,
            this.frame*16, 16, 16, 16, 16, 16, 8, 8, -Math.PI/2*this.direction);
    }


    private drawSlime(canvas : RenderTarget, bmp : Bitmap) : void {

        canvas.drawBitmap(bmp, Flip.None, this.pos.x - 8, this.pos.y - 8,
            32 + this.frame*16, 16, 16, 16);
    }


    private drawCar(canvas : RenderTarget, bmp : Bitmap) : void {

        canvas.drawBitmap(bmp, this.direction > 0 ? Flip.Horizontal : Flip.None, 
            this.pos.x - 8, this.pos.y - 8,
            96 + this.frame*16, 16, 16, 16);
    }


    public update(baseSpeed : number, comp : ProgramComponents) : void {

        if (!this.exists) {

            return;
        }

        switch (this.type) {

        case EnemyType.StaticBee:
            
            this.updateStaticBee(12, 120, comp.tick);
            break;

        case EnemyType.MovingBee:

            this.updateMovingBee(baseSpeed, comp.tick);
            break;

        case EnemyType.Slime:

            this.updateSlime(comp.tick);
            break;

        case EnemyType.Car:

            this.updateCar(baseSpeed, comp.tick);
            break;

        default:
            break;
        }

        this.pos.y += baseSpeed*comp.tick;
        if (this.pos.y >= 192 + 16) {

            this.exists = false;
        }

        this.move(comp.tick);
    }   


    public draw(canvas : RenderTarget, bmp : Bitmap) : void {

        switch (this.type) {

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

        default:
            break;
        }
    }


    public spawn(x : number, y : number, type : EnemyType, referencePlatform : Platform) : void {

        this.pos.setValues(x, y);
        this.type = type;

        this.speed.zero();
        this.speedTarget.zero();

        this.waveTimer = Math.random()*Math.PI*2;
        this.direction = Math.random() > 0.5 ? 1 : -1;

        this.referencePlatform = referencePlatform;

        this.frame = 0;
        this.frameTimer = 0.0;

        switch (this.type) {

        case EnemyType.Slime:

            this.frame = (Math.random()*4) | 0;
            break;

        case EnemyType.MovingBee:
        case EnemyType.StaticBee:

            this.pos.y -= 16;
            break;

        default:
            break;
        }

        this.exists = true;
    }
}
