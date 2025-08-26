import { Bitmap, Flip, RenderTarget } from "./gfx.js";
import { sampleWeighted } from "./random.js";


const enum Tile {
  
    Gap = 0,
    Ground = 1,
};


const enum Decoration {

    None = 0,
    SmallBush = 1,
    BigBush = 2,
    Palmtree = 3,

};


const VINE_LENGTH_WEIGHTS : number[] = [0.0, 0.3, 0.5, 0.2];


export class Platform {

    private y : number;
    private screenHeight : number;
    private initialShift : number;

    private tiles : Tile[];
    private vines : number[];
    private decorations : Decoration[];


    constructor(y : number, screenHeight : number, initialShift : number) {

        this.y = y;
        this.screenHeight = screenHeight;
        this.initialShift = initialShift;

        this.tiles = (new Array<Tile> (14)).fill(Tile.Gap);
        this.vines = (new Array<number> (14)).fill(0);
        this.decorations = (new Array<Decoration> (14)).fill(Decoration.None);

        this.generateTiles();
    }


    private generateTiles() : void {

        const VINE_INITIAL_PROB : number = 0.15;
        const VINE_PROP_INCREMENT : number = 0.05;

        const MAX_LENGTHS : number[] = [4, 6];

        const startWithGround : boolean = Math.random() > 0.5;

        this.tiles.fill(0);
        this.vines.fill(0);
        this.decorations.fill(Decoration.None);

        let ground : boolean = startWithGround;
        let counter : number = 0;
        let vineProb : number = VINE_INITIAL_PROB;
        let lastVineLength : number = 0;

        let length : number = (1 + Math.random()*MAX_LENGTHS[Number(ground)]) | 0;

        let first : boolean = true;
        let last : boolean = length == 1;

        for (let i : number = 0; i < this.tiles.length; ++ i) {

            ++ counter;

            this.tiles[i] = ground ? Tile.Ground : Tile.Gap;

            // Generate vines
            if (ground && !first && !last) {

                if (Math.random() <= vineProb) {

                    let vineLength : number = sampleWeighted(VINE_LENGTH_WEIGHTS);
                    if (vineLength == lastVineLength) {

                        ++ vineLength;
                        if (vineLength > 3) {

                            vineLength = 1;
                        }
                    }
                    lastVineLength = vineLength;

                    this.vines[i] = vineLength;
                    vineProb = 0.0;
                }
                else {

                    vineProb += VINE_PROP_INCREMENT;
                }
            }

            if (counter >= length) {

                counter = 0;
                ground = !ground;

                const max : number = MAX_LENGTHS[Number(ground)];
                length = (1 + Math.random()*max) | 0;

                vineProb = VINE_INITIAL_PROB;

                first = true;
                continue;
            }

            first = false;
            last = counter == length - 1;
        }
    }


    private drawGround(canvas : RenderTarget, bmp : Bitmap, x : number) : void {

        const left : boolean = x == 0 || this.tiles[x - 1] == Tile.Ground;
        const right : boolean = x == this.tiles.length - 1 || this.tiles[x + 1] == Tile.Ground;

        const tileLeft : number = left ? 8 : 0;
        const tileRight : number = right ? 16 : 24;
        
        const dx : number = x*16;

        canvas.drawBitmap(bmp, Flip.None, dx, this.y, tileLeft, 0, 8, 16);
        canvas.drawBitmap(bmp, Flip.None, dx + 8, this.y, tileRight, 0, 8, 16);

        if (this.vines[x] > 0) {

            // Top
            canvas.drawBitmap(bmp, Flip.None, dx, this.y - 8, 64, 0, 16, 8);

            // Middle
            for (let i : number = 0; i < this.vines[x]*2; ++ i) {

                canvas.drawBitmap(bmp, Flip.None, dx, this.y + i*8, 64, 8, 16, 8);
            }

            // Bottom
            canvas.drawBitmap(bmp, Flip.None, dx, this.y + this.vines[x]*16, 64, 16, 16, 8);
        }
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
