import { AudioSample, OscType, Ramp } from "./audiosample.js";


const GLOBAL_VOLUME : number = 0.50;


export class AudioPlayer {


    private readonly ctx : AudioContext;


    constructor(ctx : AudioContext) {

        this.ctx = ctx;
    }


     public createSample(sequence : number[], baseVolume : number = 1.0,
        type : OscType = OscType.Square, ramp : Ramp = Ramp.Exponential,
        attackTime : number = 0.40) : AudioSample {

        return new AudioSample(this.ctx, sequence, baseVolume, type, ramp, attackTime);
    }


    public playSample(sample : AudioSample, volume : number = 0.60) : void {

        try {

            sample.play(volume*GLOBAL_VOLUME);
        }
        catch (e) {}
    }
}
