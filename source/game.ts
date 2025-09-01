import { Align, Bitmap, Flip, RenderTarget } from "./gfx.js";
import { Program } from "./program.js";
import { generateAssets } from "./assetgen.js";
import { BitmapIndex, Controls, SampleIndex } from "./mnemonics.js";
import { Stage } from "./stage.js";
import { Assets } from "./assets.js";
import { Stats } from "./stats.js";
import { approachValue } from "./utility.js";
import { clamp } from "./math.js";
import { InputState } from "./controller.js";


const enum Scene {

    Game = 0,
    TitleScreen = 1,
    Intro = 2,
}


const HEALTHBAR_COLORS : string[] = ["#ffffff", "#000000", "rgba(0,0,0,0.33)"];

const GAMEOVER_APPEAR_TIME : number = 30;
const FADE_TIME : number = 20;


export class Game extends Program {


    private stage : Stage;
    private stats : Stats;

    private waveTimer : number = 0.0;
    private gameoverTimer : number = 0;
    private gameoverPhase : number = 0;

    private fadeTimer : number = FADE_TIME;
    private fadingIn : boolean = false;

    private scene : Scene = Scene.Game;

    private paused : boolean = false;


    constructor(audioCtx : AudioContext) {

        super(audioCtx, 256, 192, [
            {id: Controls.Right, keys: ["ArrowRight"], prevent: true},
            {id: Controls.Left, keys: ["ArrowLeft"], prevent: true},
            {id: Controls.Jump, keys: ["Space", "KeyZ"], prevent: true},
            {id: Controls.Tongue, keys: ["ControlLeft", "KeyX"], prevent: true},
            {id: Controls.Select, keys: ["Space", "Enter"], prevent: true},
            {id: Controls.Pause, keys: ["Escape", "Enter"], prevent: false},
        ]);

        this.stats = new Stats(0.5);
        this.stage = new Stage(this.stats);
    }


    private restartGame() : void {

        this.gameoverPhase = 0;
        this.stats.reset(0.5);
        this.stage = new Stage(this.stats);
    }


    private updateGameScene() : void {

        const WAVE_SPEED : number = Math.PI*2.0/90.0;

        if (this.fadeTimer > 0) {

            this.fadeTimer -= this.components.tick;
            if (this.fadeTimer <= 0) {

                if (this.fadingIn) {

                    this.fadeTimer += FADE_TIME;
                    this.fadingIn = false;
                
                    this.restartGame();
                }
                else {

                    this.fadeTimer = 0;
                }
            }
            return;
        }

        if (!this.paused) {
        
            this.waveTimer = (this.waveTimer + WAVE_SPEED*this.components.tick) % (Math.PI*2.0);
        }

        if (this.gameoverPhase == 1) {

            this.gameoverTimer += this.components.tick;
            if (this.gameoverTimer >= GAMEOVER_APPEAR_TIME) {

                this.gameoverTimer = GAMEOVER_APPEAR_TIME;
                this.gameoverPhase = 2;
            }
            return;
        }
        else if (this.gameoverPhase == 2) {

            if (this.components.controller.anythingPressed()) {

                this.components.audio.playSample(this.components.assets.getSample(SampleIndex.Start), 0.60);

                this.fadeTimer = FADE_TIME;
                this.fadingIn = true;
            }
            return;
        }

        if (this.components.controller.getAction(Controls.Pause).state == InputState.Pressed) {

            this.components.audio.playSample(this.components.assets.getSample(SampleIndex.Start), 0.60);
            this.paused = !this.paused;
        }
        if (this.paused) {

            return;
        }

        this.stage.update(this.components);
        this.stats.update(this.stage.getBaseSpeed(), this.components.tick);

        if (this.stage.isGameOver() && this.stage.getBaseSpeed() <= 0.0) {

            this.stats.storeRecord();
            this.gameoverPhase = 1;
            this.gameoverTimer = 0;
        }
    }


    private drawGameoverScreen() : void {

        if (this.gameoverPhase == 0) {

            return;
        }

        const canvas : RenderTarget = this.canvas;
        const bmpFontOutlines : Bitmap = this.components.assets.getBitmap(BitmapIndex.FontOutlinesWhite);
        const bmpGameover : Bitmap = this.components.assets.getBitmap(BitmapIndex.GameOver);

        const shifty : number = canvas.height/2*(1.0 - this.gameoverTimer/GAMEOVER_APPEAR_TIME);
        
        canvas.setColor("rgba(0,0,0,0.50)");
        canvas.fillRect();

        canvas.moveTo(0, -shifty);
        canvas.drawHorizontallyWavingBitmap(bmpGameover, 4, Math.PI*16, this.waveTimer, Flip.None, canvas.width/2 - bmpGameover.width/2, 16);

        canvas.moveTo(0, shifty);
        canvas.drawText(bmpFontOutlines, "SCORE:", canvas.width/2, canvas.height/2, -8, 0, Align.Center);
        canvas.drawText(bmpFontOutlines, 
            String(this.stats.score | 0).padStart(8, "0"), 
            canvas.width/2, canvas.height/2 + 12, -8, 0, Align.Center);

        canvas.drawText(bmpFontOutlines, "HI-SCORE:", canvas.width/2, canvas.height/2 + 40, -8, 0, Align.Center);
        canvas.drawText(bmpFontOutlines, 
            String(this.stats.hiscore | 0).padStart(8, "0"), 
            canvas.width/2, canvas.height/2 + 52, -8, 0, Align.Center);

        canvas.moveTo();
    }


    private drawHUD(alpha : number = 1.0) : void {

        const HEALTHBAR_WIDTH : number = 128;
        const HEALTHBAR_HEIGHT : number = 6;

        if (this.gameoverPhase > 0) {

            return;
        }

        const canvas : RenderTarget = this.canvas;
        const bmpBase : Bitmap = this.components.assets.getBitmap(BitmapIndex.Base);
        const bmpFontOutlines : Bitmap = this.components.assets.getBitmap(BitmapIndex.FontOutlinesWhite);

        canvas.setAlpha(alpha);

        // Score
        const scoreStr : string = String(this.stats.visibleScore | 0).padStart(8, "0");
        canvas.drawBitmap(bmpBase, Flip.None, 16, 1, 40, 96, 24, 8);
        canvas.drawText(bmpFontOutlines, scoreStr, -2, 6, -9, 0);

        // Bonus
        const bonusStr : string = "+" + (1.0 + this.stats.coins/10.0).toFixed(1);
        canvas.drawBitmap(bmpBase, Flip.None, canvas.width - 32, 1, 40, 104, 24, 8);
        canvas.drawText(bmpFontOutlines, bonusStr, canvas.width - 22, 6, -9, 0, Align.Center);

        //
        // Health ("Void")
        // 

        if (this.stage.isGameOver() ||
            (this.stats.visibleHealth <= 0.0 && 
            (this.waveTimer % (Math.PI/2)) < Math.PI/4)) {

            canvas.setAlpha();
            return;
        }

        let dw : number = HEALTHBAR_WIDTH + 4;
        let dh : number = HEALTHBAR_HEIGHT + 4;
        let dx : number = canvas.width/2 - dw/2;
        let dy : number = canvas.height - 12;

        for (let i : number = 0; i < 3; ++ i) {

            canvas.setColor(HEALTHBAR_COLORS[i]);
            if (i == 2) {

                canvas.fillRect(dx, dy, dw, dh);
            }
            else {

                canvas.strokeRect(dx, dy, dw, dh);
            }

            if (i != 2) {

                dw -= 2;
                dh -= 2;
                dx += 1;
                dy += 1;
            }
        }

        if (this.stats.visibleHealth > 0.0) {

            const t : number = this.stats.visibleHealth*2.0;
            const w : number = this.stats.visibleHealth*HEALTHBAR_WIDTH;

            const r : number = Math.max(0.0, t*182 + (1.0 - t)*219);
            const g : number = t*109;
            const b : number = t*255;

            canvas.setColor(`rgba(${r},${g},${b},1.0)`);

            const period : number = Math.PI/HEALTHBAR_HEIGHT;
            for (let y : number = 0; y < HEALTHBAR_HEIGHT; ++ y) {

                const shift : number = Math.sin(y*period + this.waveTimer)*2;
                canvas.fillRect(dx, dy + y, clamp(w + shift, 0, HEALTHBAR_WIDTH), 1);
            }
        }

        canvas.setAlpha();

        if (alpha < 1.0) {

            canvas.drawText(bmpFontOutlines, "VOID", canvas.width/2, canvas.height - 18, -7, 0, Align.Center,
                Math.PI*2, 1, this.waveTimer*2
            );
        }
    }


    private drawGameScene() : void {
        
        const canvas : RenderTarget = this.canvas;

        canvas.moveTo();
        
        this.stage.drawEnvironment(canvas, this.components.assets);
        this.drawHUD();
        this.stage.drawObjects(canvas, this.components.assets);
        this.drawHUD(0.33);

        this.drawGameoverScreen();

        if (this.fadeTimer > 0) {

            const t : number = this.fadingIn ? 1.0 - this.fadeTimer/FADE_TIME : this.fadeTimer/FADE_TIME;
            canvas.setColor(`rgba(0,0,0,${t})`);
            canvas.fillRect();
        }

        if (this.paused) {

            const bmpFontOutlines : Bitmap = this.components.assets.getBitmap(BitmapIndex.FontOutlinesWhite);

            canvas.setColor("rgba(0,0,0,0.5)");
            canvas.fillRect();
            canvas.drawText(bmpFontOutlines, "PAUSED", canvas.width/2, canvas.height/2 - 8, -8, 0, Align.Center);
        }

        // canvas.drawBitmap(this.components.assets.getBitmap(BitmapIndex.Terrain));
    }


    public onInit() : void {
        
        this.components.assets.loadBitmaps(
            [
            {id: BitmapIndex.FontRaw, path: "f.png"},
            {id: BitmapIndex.BaseRaw, path: "b.png"}
        ]);
    }


    public onLoad() : void {
        
        generateAssets(this.components);
    }


    public onUpdate() : void {
        
        switch (this.scene) {

        case Scene.Game:
            
            this.updateGameScene();
            break;

        default:
            break;
        }
    }


    public onRedraw() : void {
        
        switch (this.scene) {

        case Scene.Game:
            
            this.drawGameScene();
            break;

        default:
            break;
        }
    }
}