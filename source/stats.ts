import { clamp } from "./math.js";
import { approachValue } from "./utility.js";


export class Stats {

    
    private score : number = 0;
    private health : number;

    // These are public to save bytes
    public coins : number = 0;
    public visibleHealth : number;
    public visibleScore : number = 0;
    public scoreDelta : number = 0;


    constructor(initialHealth : number) {

        this.health = initialHealth;
        this.visibleHealth = initialHealth;
    }


    public addPoints(points : number) : void {

        const v : number = points*(1.0 + this.coins/10.0);
        this.score += v;
        this.scoreDelta = Math.max(5, v/20.0);
    }

    
    public updateHealth(change : number) : void {

        this.health = clamp(this.health + change, 0.0, 1.0);
    }


    public update(baseSpeed : number, tick : number) : void {

        const HEALTH_REDUCTION : number = (1.0/10.0)/60.0;
        const HEALTH_BAR_APPROACH_SPEED : number = 1.0/120.0;

        this.visibleScore = approachValue(
            this.visibleScore, 
            this.score, 
            this.scoreDelta*tick);

        this.visibleHealth = approachValue(
            this.visibleHealth, 
            this.health, 
            HEALTH_BAR_APPROACH_SPEED*tick);
    
        this.health = Math.max(0.0, 
            this.health - HEALTH_REDUCTION*baseSpeed*tick);
    }
}
