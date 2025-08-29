import { Assets } from "./assets.js";
import { Bitmap, Flip, RenderTarget } from "./gfx.js";
import { ProgramComponents } from "./program.js";
import { BitmapIndex } from "./mnemonics.js";
import { Platform } from "./platform.js";
import { Player } from "./player.js";
import { Enemy, EnemyType } from "./enemy.js";
import { nextExistingObject } from "./existingobject.js";
import { sampleWeighted } from "./random.js";


const ENEMY_WEIGHTS : number[] = [0.166, 0.166, 0.166, 0.166, 0.166, 0.170];
const ENEMY_COUNT_WEIGHTS : number[] = [0.20, 0.60, 0.20];
const COIN_COUNT_WEIGHTS : number[] = [0.50, 0.40, 0.10];

const GROUND_ENEMIES : boolean[] = [false, false, false, true, true, false, true];


export class Stage {


    private wallPosition : number = 0.0;
    private baseSpeed : number = 1.0;

    private platforms : Platform[];
    private player : Player;
    private enemies : Enemy[];
    // Coins live in a different array to make sure
    // that they are always draw after enemies (and take
    // tongue collision also after enemies!)
    private coins : Enemy[];

    
    constructor() {

        this.platforms = new Array<Platform> (6);
        for (let y : number = 0; y < this.platforms.length; ++ y) {

            const dy : number = -64 + y*64;
            this.platforms[y] = new Platform(dy, 320, -64);
        }

        this.player = new Player(128, 32);
        this.enemies = new Array<Enemy> ();
        this.coins = new Array<Enemy> ();
    }


    private findFreeTile(platform : Platform, reserved : boolean[], ignoreBridge : boolean = false) : number {

        const startPos : number = (Math.random()*14) | 0;

        let x : number = startPos;
        do {

            if (!reserved[x] && platform.isGround(x, ignoreBridge)) {

                return x + 1;
            }
            x = (x + 1) % 14;
        }
        while(x != startPos);

        return 0;
    }


    private generateEnemiesAndCoins(platform : Platform) : void {

        const reservedTiles : boolean[] = (new Array<boolean> (14)).fill(false);

        // Step 1: enemies
        const enemyCount : number = sampleWeighted(ENEMY_COUNT_WEIGHTS);
        for (let i : number = 0; i < enemyCount; ++ i) {

            let x : number = 1 + ((Math.random()*14) | 0);
            const type : EnemyType = (1 + sampleWeighted(ENEMY_WEIGHTS)) as EnemyType;
            if (GROUND_ENEMIES[type]) {

                x = this.findFreeTile(platform, reservedTiles, type == EnemyType.ChainBall);
                if (x == 0) {

                    continue;
                }
            }

            const dx : number = x*16 + 8;
            const dy : number = platform.getY() - 8;

            nextExistingObject<Enemy>(this.enemies, Enemy).spawn(dx, dy, type, platform);
            reservedTiles[x - 1] = true;
        }

        // Step 2: coins
        const coinCount : number = sampleWeighted(COIN_COUNT_WEIGHTS);
        for (let i : number = 0; i < coinCount; ++ i) {

            const x : number = this.findFreeTile(platform, reservedTiles);
            if (x == 0) {

                break;
            }

            const dx : number = x*16 + 8;
            const dy : number = platform.getY() - 8;

            nextExistingObject<Enemy>(this.coins, Enemy).spawn(dx, dy, EnemyType.Coin, platform);
            reservedTiles[x - 1] = true;
        }
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

        this.player.update(this.baseSpeed, comp);

        for (const e of this.enemies) {

            e.update(this.baseSpeed, comp);
            e.playerCollision(this.player, comp);
        }

        for (const c of this.coins) {

            c.update(this.baseSpeed, comp);
            c.playerCollision(this.player, comp);
        }

        for (const p of this.platforms) {

            if (p.update(this.baseSpeed, comp.tick)) {

                this.generateEnemiesAndCoins(p);
            }
            p.playerCollision(this.player, this.baseSpeed, comp.tick);
        }
    }


    public draw(canvas : RenderTarget, assets : Assets) : void {

        const bmpTerrain : Bitmap = assets.getBitmap(BitmapIndex.Terrain);
        const bmpBackground : Bitmap = assets.getBitmap(BitmapIndex.Background);
        const bmpObjects : Bitmap = assets.getBitmap(BitmapIndex.GameObjects);

        this.drawBackground(canvas, bmpBackground);
        this.drawWalls(canvas, bmpTerrain);
        
        for (const p of this.platforms) {

            p.draw(canvas, bmpTerrain);
        }

        this.player.preDraw(canvas);

        // Objects behind the player
        for (const e of this.enemies) {

            if (e.isSticky()) {

                continue;
            }
            e.draw(canvas, bmpObjects);
        }
        for (const c of this.coins) {

            if (c.isSticky()) {

                continue;
            }
            c.draw(canvas, bmpObjects);
        }

        this.player.draw(canvas, assets);

        // Objects in front of the player
        for (const e of this.enemies) {

            if (!e.isSticky()) {

                continue;
            }
            e.draw(canvas, bmpObjects);
        }
        for (const c of this.coins) {

            if (!c.isSticky()) {

                continue;
            }
            c.draw(canvas, bmpObjects);
        }
    }
}