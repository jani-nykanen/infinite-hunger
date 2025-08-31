import { Assets } from "./assets.js";
import { Bitmap, Flip, RenderTarget } from "./gfx.js";
import { ProgramComponents } from "./program.js";
import { BitmapIndex } from "./mnemonics.js";
import { Platform } from "./platform.js";
import { Player } from "./player.js";
import { Enemy, EnemyType } from "./enemy.js";
import { nextExistingObject } from "./existingobject.js";
import { sampleWeighted, sampleWeightedInterpolated } from "./random.js";
import { approachValue } from "./utility.js";
import { clamp } from "./math.js";
import { Particle } from "./particle.js";
import { Stats } from "./stats.js";
import { Vector } from "./vector.js";


const ENEMY_WEIGHTS_INITIAL : number[] = [0.30, 0.25, 0.30, 0.15, 0.0, 0.0, 0.0];
const ENEMY_WEIGHTS_FINAL : number[] = [0.125, 0.125, 0.125, 0.125, 0.10, 0.25, 0.15];

const ENEMY_COUNT_WEIGHTS_INITIAL : number[] = [0.20, 0.60, 0.20, 0.0, 0.0];
const ENEMY_COUNT_WEIGHTS_FINAL : number[] = [0.0, 0.20, 0.40, 0.30, 0.1];

const COIN_COUNT_WEIGHTS_INITIAL : number[] = [0.50, 0.40, 0.10, 0.0];
const COIN_COUNT_WEIGHTS_FINAL : number[] = [0.30, 0.45, 0.20, 0.05];

const GROUND_ENEMIES : boolean[] = [false, false, false, true, true, false, true];

const SPEED_UP_TIMER : number[] = [15*60, 60*60, 120*60, 210*60, 360*60];
const BASE_SPEEDS : number[] = [0.5, 0.75, 1.0, 1.25, 1.5];


export class Stage {

    private baseSpeed : number = 0.0;
    private baseSpeedTarget : number = 0.0;
    private speedUpTimer : number = 0.0;
    private speedUpIndex : number = 0;

    private wallPosition : number = 0.0;
    private spikeAnimationTimer : number = 0.0;

    private platforms : Platform[];
    private player : Player;
    private enemies : Enemy[];
    // Coins live in a different array to make sure
    // that they are always draw after enemies (and take
    // tongue collision also after enemies!)
    private coins : Enemy[];
    private particles : Particle[];

    private shake : Vector;

    
    constructor(stats : Stats) {

        const INITIAL_PLATFORM : number = 3;

        this.player = new Player(128, 120, stats);
        this.enemies = new Array<Enemy> ();
        this.coins = new Array<Enemy> ();

        this.platforms = new Array<Platform> (6);
        for (let y : number = 0; y < this.platforms.length; ++ y) {

            const dy : number = -64 + y*64;
            this.platforms[y] = new Platform(dy, 320, -64, y == INITIAL_PLATFORM, y > INITIAL_PLATFORM);
            if (y < INITIAL_PLATFORM) {

                this.generateEnemiesAndCoins(this.platforms[y], 0.0);
            }
        }

        this.particles = new Array<Particle> ();

        this.shake = Vector.zero();
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


    private generateEnemiesAndCoins(platform : Platform, t : number) : void {

        const reservedTiles : boolean[] = (new Array<boolean> (14)).fill(false);

        // Step 1: enemies
        const enemyCount : number = sampleWeightedInterpolated(ENEMY_COUNT_WEIGHTS_INITIAL, ENEMY_COUNT_WEIGHTS_FINAL, t);
        for (let i : number = 0; i < enemyCount; ++ i) {

            let x : number = 1 + ((Math.random()*14) | 0);
            const type : EnemyType = (1 + sampleWeightedInterpolated(ENEMY_WEIGHTS_INITIAL, ENEMY_WEIGHTS_FINAL, t)) as EnemyType;
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
        const coinCount : number = sampleWeightedInterpolated(COIN_COUNT_WEIGHTS_INITIAL, COIN_COUNT_WEIGHTS_FINAL, t);
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
            canvas.drawBitmap(bmp, Flip.None, -8, y*16 + this.wallPosition, 40, 0, 24, 16);
            // Right
            canvas.drawBitmap(bmp, Flip.None, canvas.width - 16, y*16 + this.wallPosition, 32, 0, 24, 16);
        }

        // Black outlines to outer edge
        canvas.setColor("#000000");
        for (let i : number = 0; i < 2; ++ i) {
            
            canvas.fillRect(15 + (canvas.width - 31)*i, 0, 1, canvas.height);
        }
    }


    private drawEnemiesAndCoins(canvas : RenderTarget, bmp : Bitmap, foreground : boolean) : void {

        for (const e of this.enemies) {

            if (e.isSticky() != foreground) {

                continue;
            }
            e.draw(canvas, bmp);
        }
        for (const c of this.coins) {

            if (c.isSticky() != foreground) {

                continue;
            }
            c.draw(canvas, bmp);
        }
    }


    private applyShake(canvas : RenderTarget) : void {

        if (this.player.getHurtTimer() < 0.5) {

            return;
        }
        canvas.move(this.shake.x, this.shake.y);
    }


    public update(comp : ProgramComponents) : void {

        const SHAKE_AMOUNT : number = 3;
        const SPIKE_ANIMATION_SPEED : number = 1.0/30.0;
        const BASE_SPEED_DELTA : number = 0.5/120.0;
        const FINAL_TIME : number = 60*300;

        this.speedUpTimer += comp.tick;
        if (this.speedUpIndex < SPEED_UP_TIMER.length &&
            this.speedUpTimer >= SPEED_UP_TIMER[this.speedUpIndex]) {

            ++ this.speedUpIndex;
        }
        this.baseSpeedTarget = BASE_SPEEDS[this.speedUpIndex];
        this.baseSpeed = approachValue(this.baseSpeed, this.baseSpeedTarget, BASE_SPEED_DELTA*comp.tick);

        const t : number = clamp(this.speedUpTimer/FINAL_TIME, 0.0, 1.0);

        this.spikeAnimationTimer = (this.spikeAnimationTimer + SPIKE_ANIMATION_SPEED*comp.tick) % 1.0; 
        this.wallPosition = (this.wallPosition + this.baseSpeed*comp.tick) % 16.0;

        this.player.update(this.baseSpeed, comp);
        if (this.player.getHurtTimer() >= 0.5) {

            this.shake.setValues(
                (-1 + Math.random()*2)*SHAKE_AMOUNT,
                (-1 + Math.random()*2)*SHAKE_AMOUNT);
        }

        for (let i : number = 0; i < this.enemies.length; ++ i) {

            const e : Enemy = this.enemies[i];

            e.update(this.baseSpeed, comp);
            e.playerCollision(this.player, this.particles, comp);

            if (e.doesExist() && !e.isDying()) {

                for (let j : number = i + 1; j < this.enemies.length; ++ j) {

                    e.enemyCollision(this.enemies[j]);
                }
            }
        }

        for (const c of this.coins) {

            c.update(this.baseSpeed, comp);
            c.playerCollision(this.player, this.particles, comp);
        }

        for (const p of this.platforms) {

            if (p.update(this.baseSpeed, t, comp.tick)) {

                this.generateEnemiesAndCoins(p, t);
            }
            p.playerCollision(this.player, this.baseSpeed, comp);
        }
    
        for (const p of this.particles) {

            p.update(this.baseSpeed, comp.tick);
        }
    }


    public drawEnvironment(canvas : RenderTarget, assets : Assets) : void {

        const bmpTerrain : Bitmap = assets.getBitmap(BitmapIndex.Terrain);
        const bmpBackground : Bitmap = assets.getBitmap(BitmapIndex.Background);

        this.drawBackground(canvas, bmpBackground);

        this.applyShake(canvas);
        this.drawWalls(canvas, bmpTerrain);
        
        for (const p of this.platforms) {

            p.draw(canvas, bmpTerrain, this.spikeAnimationTimer);
        }

        canvas.moveTo();
    }


    public drawObjects(canvas : RenderTarget, assets : Assets) : void {

        const bmpObjects : Bitmap = assets.getBitmap(BitmapIndex.GameObjects);

        this.applyShake(canvas);

        this.player.preDraw(canvas);

        // Objects behind the player
        this.drawEnemiesAndCoins(canvas, bmpObjects, false);

        this.player.draw(canvas, assets);

        // Objects in front of the player
        this.drawEnemiesAndCoins(canvas, bmpObjects, true);

        for (const p of this.particles) {

            p.draw(canvas);
        }
        
        this.player.postDraw(canvas, assets);

        canvas.moveTo();
    }


    public getBaseSpeed() : number {

        return this.baseSpeed;
    }
}