

export class Vector {


    public x : number;
    public y : number;


    constructor(x : number = 0.0, y : number = 0.0) {

        this.x = x;
        this.y = y;
    }


    public zero() : void {

        this.x = 0.0;
        this.y = 0.0;
    }


    public length() : number {

        return Math.hypot(this.x, this.y);
    }


    public normalize(forceUnit : boolean = false) : void {

        const THRESHOLD : number = 0.001;

        const len : number = this.length();
        if (len < THRESHOLD) {

            this.zero();
            if (forceUnit) {
             
                this.x = 1.0;
            }
            return;
        }

        this.x /= len;
        this.y /= len;
    }


    public clone() : Vector {

        return new Vector(this.x, this.y);
    }


    public makeEqual(v : Vector) : void {

        this.x = v.x;
        this.y = v.y;
    }


    public setValues(x : number, y : number) : Vector {

        this.x = x;
        this.y = y;

        return this;
    }


    public distanceTo(target : Vector) : number {

        return Math.hypot(target.x - this.x, target.y - this.y);
    }


    static zero() : Vector {

        return new Vector();
    }
    
}
