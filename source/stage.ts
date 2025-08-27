import { Assets } from "./assets.js";
import { Bitmap, Flip, RenderTarget } from "./gfx.js";
import { ProgramComponents } from "./program.js";
import { BitmapIndex } from "./mnemonics.js";
import { Platform } from "./platform.js";
import { Player } from "./player.js";


export class Stage {


    private wallPosition : number = 0.0;
    private baseSpeed : number = 1.0;

    private platforms : Platform[];
    private player : Player;

    
    constructor() {

        this.platforms = new Array<Platform> (5);
        for (let y : number = 0; y < this.platforms.length; ++ y) {

            const dy : number = -64 + y*64;
            this.platforms[y] = new Platform(dy, 256, -64);
        }

        this.player = new Player(128, 32);
    }


    private drawBackground(canvas : RenderTarget, bmp : Bitmap) : void {

        canvas.clearScreen("#92dbff");

        // Moon
        canvas.drawBitmap(bmp, Flip.None, canvas.width - 112, 16, 0, 80, 80, 80);

        // Forest
        canvas.drawBitmap(bmp, Flip.None, 0, 192 - 72, 0, 0, 256, 80);
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

        this.player.update(comp);

        for (const p of this.platforms) {

            p.update(this.baseSpeed, comp.tick);
            p.playerCollision(this.player, this.baseSpeed, comp.tick);
        }
    }


    public draw(canvas : RenderTarget, assets : Assets) : void {

        const bmpTerrain : Bitmap = assets.getBitmap(BitmapIndex.Terrain);
        const bmpBackground : Bitmap = assets.getBitmap(BitmapIndex.Background);

        this.drawBackground(canvas, bmpBackground);
        this.drawWalls(canvas, bmpTerrain);
        for (const p of this.platforms) {

            p.draw(canvas, bmpTerrain);
        }

        this.player.draw(canvas, assets);
    }
}