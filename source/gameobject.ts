import { Vector } from "./vector.js";
import { approachValue } from "./utility.js";
import { ExistingObject } from "./existingobject.js";
import { Rectangle } from "./rectangle.js";


export class GameObject implements ExistingObject {

    protected pos : Vector;
    protected speed : Vector;
    protected speedTarget : Vector;
    protected friction : Vector;

    protected exists : boolean;
    protected dying : boolean = false;

    protected hitbox : Rectangle;


    constructor(x : number, y : number, exists : boolean = true) {

        this.pos = new Vector(x, y);

        this.speed = Vector.zero();
        this.speedTarget = Vector.zero();
        this.friction = new Vector(0.20, 0.15);

        this.exists = exists;
    }


    protected move(tick : number) : void {

        this.speed.x = approachValue(this.speed.x, this.speedTarget.x, this.friction.x*tick);
        this.speed.y = approachValue(this.speed.y, this.speedTarget.y, this.friction.y*tick);

        this.pos.x += this.speed.x*tick;
        this.pos.y += this.speed.y*tick;
    }


    protected overlay(o : GameObject) : boolean {

        return this.pos.x + this.hitbox.x + this.hitbox.w/2 >= o.pos.x + o.hitbox.x - o.hitbox.w/2 &&
               this.pos.x + this.hitbox.x - this.hitbox.w/2 <= o.pos.x + o.hitbox.x + o.hitbox.w/2 &&
               this.pos.y + this.hitbox.y + this.hitbox.h/2 >= o.pos.y + o.hitbox.y - o.hitbox.h/2 &&
               this.pos.y + this.hitbox.y - this.hitbox.h/2 <= o.pos.y + o.hitbox.y + o.hitbox.h/2;
    }


    public getPosition() : Vector {

        return this.pos.clone();
    }


    public getSpeed() : Vector {

        return this.speed.clone();
    }


    public doesExist() : boolean {

        return this.exists;
    }


    public isDying() : boolean {

        return this.dying;
    }
}