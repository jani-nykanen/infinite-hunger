import { Vector } from "./vector.js";


export class Rectangle {


    public x : number;
    public y : number;
    public w : number;
    public h : number;


    constructor(x : number = 0.0, y : number = 0.0, w : number = 1.0, h : number = 1.0) {

        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }


    public clone() : Rectangle {

        return new Rectangle(this.x, this.y, this.w, this.h);
    }


    static overlayShifted(v1 : Vector, r1 : Rectangle, v2 : Vector, r2 : Rectangle) : boolean {

        return v1.x + r1.x + r1.w/2 >= v2.x + r2.x - r2.w/2 &&
               v1.x + r1.x - r1.w/2 <= v2.x + r2.x + r2.w/2 &&
               v1.y + r1.y + r1.h/2 >= v2.y + r2.y - r2.h/2 &&
               v1.y + r1.y - r1.h/2 <= v2.y + r2.y + r2.h/2;
    }
}
