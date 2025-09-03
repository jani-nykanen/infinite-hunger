import { Align, Bitmap, RenderTarget } from "./gfx.js";
import { GameObject } from "./gameobject.js";


export class FlyingText extends GameObject {


    private value : number = 0;
    private timer : number = 0;


    constructor() {

        super(0, 0, false);
    }


    public spawn(x : number, y : number, value : number) : void {

        this.pos.setValues(x, y);
        this.value = value;
        this.timer = 0;

        this.exists = true;
    }


    public update(tick : number) : void {

        const FLY_TIME : number = 16;
        const FLY_SPEED : number = -1.5;
        const WAIT_TIME : number = 30;

        if (!this.exists) {

            return;
        }

        this.timer += tick;
        if (this.timer < FLY_TIME) {

            this.pos.y += FLY_SPEED*tick;
            if (this.pos.y < 8) {

                this.pos.y = 8;
            } 
        }

        if (this.timer >= FLY_TIME + WAIT_TIME) {

            this.exists = false;
        }
    }


    public draw(canvas : RenderTarget, font : Bitmap) : void {

        if (!this.exists) {

            return;
        }
        canvas.drawText(font, `+${this.value}`, this.pos.x, this.pos.y - 8, -8, 0, Align.Center);
    }
}
