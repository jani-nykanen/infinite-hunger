import { Bitmap, Flip, RenderTarget } from "./gfx.js";
import { Player } from "./player.js";
import { sampleWeighted, sampleWeightedInterpolated } from "./random.js";


const enum Tile {
  
    Gap = 0,
    Ground = 1,
    Bridge = 2,
};


const enum Decoration {

    None = 0,
    SmallBush = 1,
    BigBush = 2,
    Palmtree = 3,
    Flower = 4,
    Rock = 5,

    Last = 5,

};


const VINE_LENGTH_WEIGHTS : number[] = [0.0, 0.4, 0.5, 0.1];
const DECORATION_WEIGHTS : number[] = [0.0, 0.20, 0.20, 0.10, 0.25, 0.25];

const SPIKE_WEIGHTS_INITIAL : number[] = [0.50, 0.40, 0.10, 0.0, 0.0];
const SPIKE_WEIGHTS_FINAL : number[] = [0.10, 0.30, 0.40, 0.15, 0.05];


export class Platform {

    private y : number;
    private screenHeight : number;
    private initialShift : number;

    private tiles : Tile[];
    private vines : number[];
    private decorations : Decoration[];
    private spikes : boolean[];


    constructor(y : number, screenHeight : number, initialShift : number, 
        initialPlatform : boolean = false, forceEmpty : boolean = false) {

        this.y = y;
        this.screenHeight = screenHeight;
        this.initialShift = initialShift;

        this.tiles = (new Array<Tile> (14)).fill(Tile.Gap);
        this.vines = (new Array<number> (14)).fill(0);
        this.decorations = (new Array<Decoration> (14)).fill(Decoration.None);
        this.spikes = (new Array<boolean> (14)).fill(false);

        if (forceEmpty) {

            return;
        }

        this.generateTiles(0.0, initialPlatform);
    }


    private clearUnwantedDecorationsAndSpikes() : void {

        for (let i : number = 0; i < this.tiles.length; ++ i) {

            if (this.decorations[i] == Decoration.None && !this.spikes[i]) {

                continue;
            }

            if ((i > 0 && this.tiles[i + 1] == Tile.Bridge) ||
                (i < this.tiles.length - 1 && this.tiles[i - 1] == Tile.Bridge)) {

                this.decorations[i] = Decoration.None;
                this.spikes[i] = false;
            }    
        }
    }


    private generateSpikes(t : number) : void {

        let maxSpikeCount : number = 0;
        for (let i : number = 0; i < this.tiles.length; ++ i) {

            if (this.tiles[i] == Tile.Ground) {

                ++ maxSpikeCount;
            }
        }
        maxSpikeCount = Math.ceil((maxSpikeCount - 1)/2);

        const spikeCount : number = Math.min(maxSpikeCount, 
            sampleWeightedInterpolated(SPIKE_WEIGHTS_INITIAL, SPIKE_WEIGHTS_FINAL, t));
        if (spikeCount == 0) {

            return;
        }

        for (let j : number = 0; j < spikeCount; ++ j) {

            const startx : number = (Math.random()*14) | 0;
            let x : number = startx;

            do {

                if (this.tiles[x] == Tile.Ground || !this.spikes[x]) {

                    this.decorations[x] = Decoration.None;
                    this.spikes[x] = true;
                    this.vines[x] = 0;
                    break;
                }

                ++ x;
            }
            while(x != startx);
        }
    }


    private generateTiles(t : number, initial : boolean) : void {

        const BRIDGE_INITIAL_PROB : number = 0.20;
        const BRIDGE_PROP_INCREMENT : number = 0.10;

        const VINE_INITIAL_PROB : number = 0.10;
        const VINE_PROP_INCREMENT : number = 0.025;

        const DECORATION_INITIAL_PROB : number = 0.15;
        const DECORATION_PROP_INCREMENT : number = 0.025;

        const MAX_LENGTHS : number[] = [4, 6];

        const startWithGround : boolean = initial || Math.random() > 0.5;

        this.tiles.fill(0);
        this.vines.fill(0);
        this.decorations.fill(Decoration.None);
        this.spikes.fill(false);

        let ground : boolean = startWithGround;
        let counter : number = 0;

        let vineProb : number = VINE_INITIAL_PROB;
        let lastVineLength : number = 0;

        let decProb : number = DECORATION_INITIAL_PROB;
        let lastDecoration : Decoration = Decoration.None;

        let length : number = (1 + Math.random()*MAX_LENGTHS[Number(ground)]) | 0;

        let first : boolean = true;
        let last : boolean = length == 1;

        let bridgeProb : number = BRIDGE_INITIAL_PROB;
        let isBridge : boolean = !ground && Math.random() <= bridgeProb;
        let bridgeCreated : boolean = isBridge;

        for (let i : number = 0; i < this.tiles.length; ++ i) {

            ++ counter;

            if (initial) {

                this.tiles[i] = Tile.Ground;
            }
            else {

                this.tiles[i] = ground ? Tile.Ground : (isBridge ? Tile.Bridge : Tile.Gap);
            }

            // Add vines 
            if (initial || (ground && !first && !last)) {

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

            // Add decorations
            if (ground && !this.vines[i]) {

                if (Math.random() <= decProb) {

                    let decType : Decoration = sampleWeighted(DECORATION_WEIGHTS) as Decoration;
                    if (decType == lastDecoration) {

                        ++ decType;
                        if (decType > Decoration.Last) {

                            decType = 1;
                        }
                    }

                    // If not enough room, make a small bush
                    if ((decType == Decoration.BigBush && (length == 1 || last || i == this.decorations.length - 1)) ||
                         (decType == Decoration.Palmtree && (i == 0 || i == this.decorations.length - 1))) {
                        
                        decType = Decoration.SmallBush;
                    }

                    this.decorations[i] = decType;
                    lastDecoration = decType;
                    decProb = 0.0;
                }
                else {

                    decProb += DECORATION_PROP_INCREMENT;
                }
            }

            if (initial) {

                continue;
            }


            // End gap/ground
            if (counter >= length) {

                counter = 0;
                ground = !ground;

                isBridge = false;
                if (!ground && !bridgeCreated) {

                    bridgeProb += BRIDGE_PROP_INCREMENT;
                    isBridge = Math.random() <= bridgeProb;
                    bridgeCreated = isBridge;
                }

                const max : number = MAX_LENGTHS[Number(ground)];
                length = (1 + Math.random()*max) | 0;

                vineProb = VINE_INITIAL_PROB;
                decProb = DECORATION_INITIAL_PROB;

                first = true;
                continue;
            }

            first = false;
            last = counter == length - 1;
        }

        if (initial) {

            return;
        }

        // Clear decorations (and spikes) possibly overlapping with bridge fence
        this.generateSpikes(t);
        this.clearUnwantedDecorationsAndSpikes();
    }


    private drawDecoration(canvas : RenderTarget, bmp : Bitmap, dx : number, type : Decoration) : void {

        switch (type) {

        case Decoration.SmallBush:

            canvas.drawBitmap(bmp, Flip.None, dx, this.y - 16, 80, 0, 8, 16);
            canvas.drawBitmap(bmp, Flip.None, dx + 8, this.y - 16, 104, 0, 8, 16);
            break;

        case Decoration.BigBush:

            canvas.drawBitmap(bmp, Flip.None, dx, this.y - 16, 80, 0, 32, 16);
            break;

        case Decoration.Palmtree:

            canvas.drawBitmap(bmp, Flip.None, dx - 8, this.y - 32, 112, 0, 32, 32);
            break;

        case Decoration.Flower:
        case Decoration.Rock:

            canvas.drawBitmap(bmp, Flip.None, dx, this.y - 16, 144 + (type - Decoration.Flower)*16, 0, 16, 16);
            break;

        default:
            break;
        }
    }


    private drawGround(canvas : RenderTarget, bmp : Bitmap, x : number, spikeAnimationTimer : number) : void {

        const left : boolean = x == 0 || this.tiles[x - 1] == Tile.Ground;
        const right : boolean = x == this.tiles.length - 1 || this.tiles[x + 1] == Tile.Ground;

        const tileLeft : number = left ? 8 : 0;
        const tileRight : number = right ? 16 : 24;
        
        const dx : number = x*16;

        canvas.drawBitmap(bmp, Flip.None, dx, this.y, tileLeft, 0, 8, 16);
        canvas.drawBitmap(bmp, Flip.None, dx + 8, this.y, tileRight, 0, 8, 16);

        if (this.decorations[x] != Decoration.None) {

            this.drawDecoration(canvas, bmp, dx, this.decorations[x]);
        }

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

        if (this.spikes[x]) {

            const frame : number = (spikeAnimationTimer*2) | 0;
            canvas.drawBitmap(bmp, Flip.None, dx, this.y - 16, 240, frame*16, 16, 16);
        }
    }


    private drawBridge(canvas : RenderTarget, bmp : Bitmap, x : number) : void {

        const dx : number = x*16;
        const dy : number = this.y - 15;

        // Left end point
        if (x > 0 && this.tiles[x - 1] == Tile.Ground) {

            canvas.drawBitmap(bmp, Flip.None, dx - 16, dy, 208, 0, 16, 15);
        }
        // Right end point
        if (x < this.tiles.length - 1 && this.tiles[x + 1] == Tile.Ground) {

            canvas.drawBitmap(bmp, Flip.None, dx + 16, dy, 224, 0, 16, 15);
        }

        // Fence
        canvas.drawBitmap(bmp, Flip.None, dx, dy, 192, 0, 16, 16);

        // Base
        canvas.drawBitmap(bmp, Flip.None, dx, this.y - 3, 176, 0, 16, 16);
    }


    public update(baseSpeed : number, t : number, tick : number) : boolean {

        this.y += baseSpeed*tick;

        if (this.y >= this.screenHeight) {

            this.y -= (this.screenHeight - this.initialShift);
            this.generateTiles(t, false);

            return true;
        }
        return false;
    }


    public draw(canvas : RenderTarget, bmp : Bitmap, spikeAnimationTimer : number) : void {

        canvas.move(16, 0);
        for (let x : number = 0; x < this.tiles.length; ++ x) {

            switch (this.tiles[x]) {

            case Tile.Ground:

                this.drawGround(canvas, bmp, x, spikeAnimationTimer);
                break;

            case Tile.Bridge:
                
                this.drawBridge(canvas, bmp, x);
                break;

            default:
                break;
            }
        }
        canvas.move(-16, 0);
    }


    public playerCollision(player : Player, baseSpeed : number, tick : number) : void {

        if (!player.doesExist() || player.isDying() || player.getPosition().y < -9) {

            return;
        }

        for (let i : number = 0; i < this.tiles.length; ++ i) {

            if (this.tiles[i] == Tile.Gap) {

                continue;
            }
            player.floorCollision(16 + i*16, this.y, 16, baseSpeed, tick);
        }
    }


    public isGround(x : number, ignoreBridge : boolean = false) : boolean {

        if (x < 0 || x >= this.tiles.length || this.spikes[x]) {

            return false;
        }
        return !ignoreBridge ? this.tiles[x] != Tile.Gap : this.tiles[x] == Tile.Ground;
    }


    public getY() : number {

        return this.y;
    }
}
