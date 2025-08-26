import { Assets } from "./assets.js";
import { Bitmap, Flip, RenderTarget } from "./gfx.js";
import { ProgramComponents } from "./program.js";
import { BitmapIndex } from "./mnemonics.js";
import { Platform } from "./platform.js";


export class Stage {


    private wallPosition : number = 0.0;
    private baseSpeed : number = 1.0;

    private platforms : Platform[];

    
    constructor() {


        this.platforms = new Array<Platform> (4);

        for (let y : number = 0; y < this.platforms.length; ++ y) {

            const dy : number = -64 + y*64;
            this.platforms[y] = new Platform(dy, 192, -64);
        }
    }


    private drawWalls(canvas : RenderTarget, bmp : Bitmap) : void {

        for (let y : number = -1; y < 12; ++ y) {

            // Left
            canvas.drawBitmap(bmp, Flip.None, 0, y*16 + this.wallPosition, 48, 0, 16, 16);
            // Right
            canvas.drawBitmap(bmp, Flip.None, canvas.width - 16, y*16 + this.wallPosition, 32, 0, 16, 16);
        }

        // Black outlines to outer edge
        canvas.setColor("#000000");
        for (let i : number = 0; i < 2; ++ i) {
            
            canvas.fillRect(15 + (canvas.width - 31)*i, 0, 1, canvas.height);
        }
    }


    public update(comp : ProgramComponents) : void {

        this.wallPosition = (this.wallPosition + this.baseSpeed*comp.tick) % 16.0;

        for (const p of this.platforms) {

            p.update(this.baseSpeed, comp.tick);
        }
    }


    public draw(canvas : RenderTarget, assets : Assets) : void {

        const bmpTerrain : Bitmap = assets.getBitmap(BitmapIndex.Terrain);

        this.drawWalls(canvas, bmpTerrain);
        for (const p of this.platforms) {

            p.draw(canvas, bmpTerrain);
        }
    }
}