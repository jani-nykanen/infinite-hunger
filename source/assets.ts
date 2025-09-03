import { AudioSample } from "./audiosample.js";
import { Bitmap } from "./gfx.js";


export type BitmapInfo = {id : number, path: string};


export class Assets {


    private bitmaps : Map<number, Bitmap>;
    private samples : Map<number, AudioSample>;
    private loadedCount : number = 0;
    private totalCount : number = 0;


    public get loaded() : boolean {

        return this.totalCount == 0 || this.loadedCount >= this.totalCount;
    }


    constructor() {

        this.bitmaps = new Map<number, Bitmap> ();
        this.samples = new Map<number, AudioSample> ();
    }


    public loadBitmaps(bitmaps : BitmapInfo[]) : void {

        for (const b of bitmaps) {

            ++ this.totalCount;

            const img : HTMLImageElement = new Image();
            img.onload = (_ : Event) : void => {

                ++ this.loadedCount;
                this.bitmaps.set(b.id, img);
            }
            img.src = b.path;
        }
    }


    public addBitmap(id : number, img : Bitmap) : void {

        this.bitmaps.set(id, img);
    }


    public addSample(id : number, sample : AudioSample) : void {

        this.samples.set(id, sample);
    } 


    public getBitmap(id : number) : Bitmap {

        return this.bitmaps.get(id)!;
    }


    public getSample(id : number) : AudioSample {

        return this.samples.get(id)!;
    }


}
