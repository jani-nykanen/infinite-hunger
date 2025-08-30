import { RenderTarget } from "./gfx.js";
import { GameObject } from "./gameobject.js";
import { nextExistingObject } from "./existingobject.js";
import { Vector } from "./vector.js";


export class Particle extends GameObject {


    private diamater : number = 0.0;


    constructor() {

        super(0, 0, false);
    }


    public spawn(x : number, y : number, speedx : number, speedy : number) : void {

        const BASE_GRAVITY : number = 4.0;

        this.pos.setValues(x, y);
        
        this.speed.setValues(speedx, speedy);
        this.speedTarget.setValues(speedx, BASE_GRAVITY);

        this.diamater = (2 + Math.random()*4) | 0;

        this.exists = true;
    }


    public update(baseSpeed : number, tick : number) : void {

        if (!this.exists) {

            return;
        }

        this.move(tick);
        this.pos.y += baseSpeed*tick;

        if (this.pos.y > 192 + this.diamater) {

            this.exists = false;
        }
    }


    public draw(canvas : RenderTarget) : void {

        if (!this.exists) {

            return;
        }

        canvas.setColor("rgba(0,0,0,0.67)");
        canvas.fillRect(
            this.pos.x - this.diamater/2, this.pos.y - this.diamater, 
            this.diamater, this.diamater);
    }
}


export const spawnParticleExplosion = (particles : Particle[], center : Vector, count : number) : void => {

    const HSPEED_VARY : number = 2.5;
    const VSPEED_MAX : number = 4.0;
    const VSPEED_MIN : number = -1.0;

    for (let i : number = 0; i < count; ++ i) {

        const speedx : number = (-1 + Math.random()*2)*HSPEED_VARY;
        const speedy : number = -(VSPEED_MIN + (VSPEED_MAX - VSPEED_MIN)*Math.random());

        nextExistingObject<Particle>(particles, Particle).spawn(
            center.x, center.y, speedx, speedy);
    }
}
