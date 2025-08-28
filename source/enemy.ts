import { GameObject } from "./gameobject.js";
import { Vector } from "./vector.js";
import { Bitmap, Flip, RenderTarget } from "./gfx.js";
import { ProgramComponents } from "./program.js";
import { BitmapIndex, Controls } from "./mnemonics.js";


export const enum EnemyType {

    StaticBee = 0,
}


export class Enemy extends GameObject {


    private type : EnemyType = EnemyType.StaticBee;

    private frame : number = 0;
    private frameTimer : number = 0;

    private dying : boolean = false;


    constructor() {

        super(0, 0, false);
    }


    private updateStaticBee(tick : number) : void {

        const ANIMATION_SPEED : number = 1.0/8.0;

        this.frameTimer += ANIMATION_SPEED*tick;
        if (this.frameTimer >= 1.0) {

            this.frame = (this.frame + 1) % 2;
            this.frameTimer -= 1.0;
        }
    }


    private drawStaticBee(canvas : RenderTarget, bmp : Bitmap) : void {

        canvas.drawBitmap(bmp, Flip.None, this.pos.x - 8, this.pos.y - 8,
            this.frame*16, 16, 16, 16);
    }


    public update(baseSpeed : number, comp : ProgramComponents) : void {

        if (!this.exists) {

            return;
        }

        switch (this.type) {

        case EnemyType.StaticBee:
            
            this.updateStaticBee(comp.tick);
            break;

        default:
            break;
        }

        this.pos.y += baseSpeed*comp.tick;

        this.move(comp.tick);
    }   


    public draw(canvas : RenderTarget, bmp : Bitmap) : void {

        switch (this.type) {

        case EnemyType.StaticBee:
            
            this.drawStaticBee(canvas, bmp);
            break;

        default:
            break;
        }
    }
}
