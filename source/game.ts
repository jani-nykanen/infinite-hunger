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

        this.stage = new Stage();
    }


    private updateGameScene() : void {
        
        this.stage.update(this.components);
    }


    private drawHUD() : void {

        const canvas : RenderTarget = this.canvas;
        const bmpBase : Bitmap = this.components.assets.getBitmap(BitmapIndex.Base);
        const bmpFontOutlines : Bitmap = this.components.assets.getBitmap(BitmapIndex.FontOutlinesWhite);

        // Score
        const scoreStr : string = String(this.stats.score).padStart(8, "0");
        canvas.drawBitmap(bmpBase, Flip.None, 16, 1, 40, 96, 24, 8);
        canvas.drawText(bmpFontOutlines, scoreStr, -2, 6, -9, 0);

        // Bonus
        const bonusStr : string = "+" + (1.0 + this.stats.coins/10.0).toFixed(1);
        canvas.drawBitmap(bmpBase, Flip.None, canvas.width - 32, 1, 40, 104, 24, 8);
        canvas.drawText(bmpFontOutlines, bonusStr, canvas.width - 22, 6, -9, 0, Align.Center);
    }


    private drawGameScene() : void {
        
        const canvas : RenderTarget = this.canvas;

        canvas.moveTo();
        
        this.stage.draw(canvas, this.components.assets);

        canvas.moveTo();
        this.drawHUD();

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