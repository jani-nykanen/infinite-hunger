import { Bitmap, Flip, RenderTarget } from "./gfx.js";


const enum Tile {
  
    Gap = 0,
    Ground = 1,
};


export class Platform {

    private y : number;
    private screenHeight : number;
    private initialShift : number;

    private tiles : Tile[];


    constructor(y : number, screenHeight : number, initialShift : number) {

        this.y = y;
        this.screenHeight = screenHeight;
        this.initialShift = initialShift;

        this.tiles = (new Array<Tile> (14)).fill(Tile.Gap);
        this.generateTiles();
    }


    private generateTiles() : void {

        const MAX_LENGTHS : number[] = [4, 6];

        const startWithGround : boolean = Math.random() > 0.5;

        let ground : boolean = startWithGround;
        let counter : number = 0;

        let length : number = (1 + Math.random()*MAX_LENGTHS[Number(ground)]) | 0;
        for (let i : number = 0; i < this.tiles.length; ++ i) {

            ++ counter;

            this.tiles[i] = ground ? Tile.Ground : Tile.Gap;

            if (counter >= length) {

                counter = 0;
                ground = !ground;

                const max : number = MAX_LENGTHS[Number(ground)];
                length = (1 + Math.random()*max) | 0;
            }
        }
    }


    private drawGround(canvas : RenderTarget, bmp : Bitmap, x : number) : void {


        const left : boolean = x == 0 || this.tiles[x - 1] == Tile.Ground;
        const right : boolean = x == this.tiles.length - 1 || this.tiles[x + 1] == Tile.Ground;

        const tileLeft : number = left ? 8 : 0;
        const tileRight : number = right ? 16 : 24;
        
        canvas.drawBitmap(bmp, Flip.None, x*16, this.y, tileLeft, 0, 8, 16);
        canvas.drawBitmap(bmp, Flip.None, x*16 + 8, this.y, tileRight, 0, 8, 16);
    }


    public update(baseSpeed : number, tick : number) : void {

        this.y += baseSpeed*tick;

        if (this.y >= this.screenHeight) {

            this.y -= (this.screenHeight - this.initialShift);
            this.generateTiles();
        }
    }


    public draw(canvas : RenderTarget, bmp : Bitmap) : void {

        canvas.move(16, 0);
        for (let x : number = 0; x < this.tiles.length; ++ x) {

            switch (this.tiles[x]) {

            case Tile.Ground:

                this.drawGround(canvas, bmp, x);
                break;

            default:
                break;
            }
        }
        canvas.move(-16, 0);
    }
}
