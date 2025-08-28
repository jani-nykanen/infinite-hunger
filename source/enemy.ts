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



    private updateStaticBee(tick : number) : void {

        const ANIMATION_SPEED : number = 1.0/4.0;
        const WAVE_AMPLITUDE : number = 8;
        const WAVE_SPEED : number = Math.PI*2/120;

        this.waveTimer = (this.waveTimer + WAVE_SPEED*tick) % (Math.PI*2);
        this.pos.y = this.referencePlatform!.getY() - 24 + Math.sin(this.waveTimer)*WAVE_AMPLITUDE;

        this.frameTimer += ANIMATION_SPEED*tick;
        if (this.frameTimer >= 1.0) {

            this.frame = (this.frame + 1) % 2;
            this.frameTimer -= 1.0;
        }
    }


    private updateMovingBee(baseSpeed : number, tick : number) : void {

        const FLY_SPEED : number = 1.0;

        this.updateStaticBee(tick);

        this.speed.x = this.direction*baseSpeed*FLY_SPEED;
        if ((this.pos.x < 24 && this.direction < 0) ||
            (this.pos.x > 232 && this.direction > 0)) {

            this.pos.x = this.direction > 0 ? 232 : 24;
            this.speed.x = -1;
            this.direction *= -1;
        }
        this.speedTarget.makeEqual(this.speed);
    }


    private drawStaticBee(canvas : RenderTarget, bmp : Bitmap) : void {

        canvas.drawBitmap(bmp, Flip.None, this.pos.x - 8, this.pos.y - 8,
            this.frame*16, 16, 16, 16);
    }


    private drawMovingBee(canvas : RenderTarget, bmp : Bitmap) : void {

        canvas.drawBitmap(bmp, Flip.None, this.pos.x - 8, this.pos.y - 8,
            this.frame*16, 16, 16, 16, 16, 16, 8, 8, -Math.PI/2*this.direction);
    }


    public update(baseSpeed : number, comp : ProgramComponents) : void {

        if (!this.exists) {

            return;
        }

        switch (this.type) {

        case EnemyType.StaticBee:
            
            this.updateStaticBee(comp.tick);
            break;

        case EnemyType.MovingBee:

            this.updateMovingBee(baseSpeed, comp.tick);
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

        this.exists = true;
    }
}
