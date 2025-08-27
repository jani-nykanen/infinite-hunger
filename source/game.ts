import { Align, Bitmap, Flip, RenderTarget } from "./gfx.js";
import { Program } from "./program.js";
import { generateAssets } from "./assetgen.js";
import { BitmapIndex, Controls, SampleIndex } from "./mnemonics.js";
import { Stage } from "./stage.js";
import { Assets } from "./assets.js";


const enum Scene {

    Game = 0,
    TitleScreen = 1,
    Intro = 2,
}


export class Game extends Program {


    private stage : Stage;

    private scene : Scene = Scene.Game;


    constructor(audioCtx : AudioContext) {

        super(audioCtx, 256, 192, [
            {id: Controls.Right, keys: ["ArrowRight", "KeyD"], specialKeys: [], prevent: true},
            {id: Controls.Left, keys: ["ArrowLeft", "KeyA"], specialKeys: [], prevent: true},
            {id: Controls.Jump, keys: ["ArrowUp", "KeyW", "Space"], specialKeys: [], prevent: true},
            {id: Controls.Select, keys: ["Space", "Enter"], specialKeys: [], prevent: true},
            {id: Controls.Pause, keys: ["Escape", "Enter"], specialKeys: [], prevent: false}
        ]);

        this.stage = new Stage();
    }



    private updateGameScene() : void {
        
        this.stage.update(this.components);
    }


    private drawGameScene() : void {
        
        const canvas : RenderTarget = this.canvas;

        canvas.moveTo();
        
        this.stage.draw(canvas, this.components.assets);

        // canvas.drawBitmap(this.components.assets.getBitmap(BitmapIndex.GameObjects));
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