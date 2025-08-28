import { Vector } from "./vector.js";
import { approachValue } from "./utility.js";
import { ExistingObject } from "./existingobject.js";


export class GameObject implements ExistingObject {

    protected pos : Vector;
    protected speed : Vector;
    protected speedTarget : Vector;
    protected friction : Vector;

    protected exists : boolean;


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


    public getPosition() : Vector {

        return this.pos.clone();
    }


    public doesExist() : boolean {

        return this.exists;
    }
}