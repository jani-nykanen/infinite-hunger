import { clamp } from "./math.js";
import { approachValue } from "./utility.js";


const LOCALSTORAGE_KEY : string = "lsjn25b";


export class Stats {

    
    private health : number;

    // These are public to save bytes
    public score : number = 0;
    public coins : number = 0;
    public visibleHealth : number;
    public visibleScore : number = 0;
    public scoreDelta : number = 0;
    public hiscore : number = 0;
    // This should be elsewhere, but this way I save
    // some bytes...
    public coinFlickerTimer : number = 0;


    constructor(initialHealth : number) {

        this.health = initialHealth;
        this.visibleHealth = initialHealth;

        try {

            this.hiscore = Number(window["localStorage"]["getItem"](LOCALSTORAGE_KEY) ?? "0");
        }
        catch(e) {}
    }


    public addCoin() : void {

        const COIN_FLICKER_TIME : number = 30;

        ++ this.coins;
        this.coinFlickerTimer = COIN_FLICKER_TIME;
    }


    public addPoints(points : number) : number {

        const v : number = (points*(1.0 + this.coins/10.0)) | 0;
        this.score += v;
        this.scoreDelta = Math.max(5, v/20.0);

        this.hiscore = Math.max(this.hiscore, this.score);

        return v;
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

        if (this.coinFlickerTimer > 0) {

            this.coinFlickerTimer -= tick;
        }
    }


    public storeRecord() : void {

        if (this.score < this.hiscore) {
            
            return;
        }

        try {

            window["localStorage"]["setItem"](LOCALSTORAGE_KEY, String(this.hiscore));
        }
        catch(e) {}
    }


    public reset(initialHealth : number) : void {

        this.score = 0;
        this.health = initialHealth;
        this.coins = 0;
        this.visibleHealth = initialHealth;
        this.visibleScore = 0;
        this.scoreDelta = 0;
    }
}
