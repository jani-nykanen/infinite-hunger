import { Align, Bitmap, Flip, RenderTarget } from "./gfx.js";
import { Program } from "./program.js";
import { generateAssets } from "./assetgen.js";
import { BitmapIndex, Controls, SampleIndex } from "./mnemonics.js";
import { Stage } from "./stage.js";
import { Assets } from "./assets.js";
import { Stats } from "./stats.js";


const enum Scene {

    Game = 0,
    TitleScreen = 1,
    Intro = 2,
}


const HEALTHBAR_COLORS : string[] = ["#ffffff", "#000000", "rgba(0,0,0,0.33)"];


export class Game extends Program {


    private stage : Stage;
    private stats : Stats;

    private scene : Scene = Scene.Game;


    constructor(audioCtx : AudioContext) {

        super(audioCtx, 256, 192, [
            {id: Controls.Right, keys: ["ArrowRight"], specialKeys: [], prevent: true},
            {id: Controls.Left, keys: ["ArrowLeft"], specialKeys: [], prevent: true},
            {id: Controls.Jump, keys: ["Space", "KeyZ"], specialKeys: [], prevent: true},
            {id: Controls.Tongue, keys: ["ControlLeft", "KeyX"], specialKeys: [], prevent: true},
            {id: Controls.Select, keys: ["Space", "Enter"], specialKeys: [], prevent: true},
            {id: Controls.Pause, keys: ["Escape", "Enter"], specialKeys: [], prevent: false},
        ]);

        this.stats = {score: 0, coins: 0, health: 0};

        this.stage = new Stage(this.stats);
    }


    private updateGameScene() : void {
        
        this.stage.update(this.components);
    }


    private drawHUD(alpha : number = 1.0) : void {

        const HEALTHBAR_WIDTH : number = 128;
        const HEALTHBAR_HEIGHT : number = 6;

        const canvas : RenderTarget = this.canvas;
        const bmpBase : Bitmap = this.components.assets.getBitmap(BitmapIndex.Base);
        const bmpFontOutlines : Bitmap = this.components.assets.getBitmap(BitmapIndex.FontOutlinesWhite);

        canvas.setAlpha(alpha);

        // Score
        const scoreStr : string = String(this.stats.score).padStart(8, "0");
        canvas.drawBitmap(bmpBase, Flip.None, 16, 1, 40, 96, 24, 8);
        canvas.drawText(bmpFontOutlines, scoreStr, -2, 6, -9, 0);

        // Bonus
        const bonusStr : string = "+" + (1.0 + this.stats.coins/10.0).toFixed(1);
        canvas.drawBitmap(bmpBase, Flip.None, canvas.width - 32, 1, 40, 104, 24, 8);
        canvas.drawText(bmpFontOutlines, bonusStr, canvas.width - 22, 6, -9, 0, Align.Center);

        // Health ("Void")
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

            dw -= 2;
            dh -= 2;
            dx += 1;
            dy += 1;
        }
        
        canvas.setAlpha();

        if (alpha < 1.0) {

            canvas.drawText(bmpFontOutlines, "VOID", canvas.width/2, canvas.height - 18, -7, 0, Align.Center);
        }
    }


    private drawGameScene() : void {
        
        const canvas : RenderTarget = this.canvas;

        canvas.moveTo();
        
        this.stage.drawEnvironment(canvas, this.components.assets);
        this.drawHUD();
        this.stage.drawObjects(canvas, this.components.assets);
        this.drawHUD(0.33);

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