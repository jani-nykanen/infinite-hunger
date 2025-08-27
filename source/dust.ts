import { Vector } from "./vector.js";
import { RenderTarget } from "./gfx.js";


export class Dust {


    private pos : Vector;

    private timer : number = 0.0;
    private timerSpeed : number = 0.0;
    private radius : number = 0.0;

    private exists : boolean = false;
    

    constructor() {

        this.pos = Vector.zero();
    }


    public spawn(x : number, y : number, timerSpeed : number, radius : number) : void {

        this.pos.setValues(x, y);
        this.timerSpeed = timerSpeed;
        this.radius = radius;
        this.timer = 1.0;

        this.exists = true;
    }


    public update(baseSpeed : number, tick : number) : void {

        if (!this.exists) {

            return;
        }

        this.pos.y += baseSpeed*tick;

        this.timer -= this.timerSpeed*tick;
        if (this.timer <= 0.0) {

            this.exists = false;
        }
    }


    public draw(canvas : RenderTarget) : void {

        if (!this.exists) {

            return;
        }

        const radius : number = this.timer*this.radius;

        canvas.setColor("rgba(0,0,0,0.67)");
        canvas.fillEllipse(this.pos.x, this.pos.y, radius, radius);
    }


    public doesExist() : boolean {

        return this.exists;
    }
}

