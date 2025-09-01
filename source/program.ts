import { ActionConfig, Controller } from "./controller.js";
import { RenderTarget } from "./gfx.js";
import { Assets } from "./assets.js";
import { AudioPlayer } from "./audioplayer.js";


export type ProgramComponents = {

    controller : Controller,
    audio : AudioPlayer,
    assets : Assets,
    tick : number,
}


export class Program {

    private timeSum : number = 0.0;
    private oldTime : number = 0.0;

    private initialized : boolean = false;

    protected readonly canvas : RenderTarget;
    protected readonly components : ProgramComponents;


    constructor(audioCtx : AudioContext,
        canvasWidth : number, canvasHeight : number,
        controllerActions : ActionConfig[], 
        ticksPerSecond : number = 60, globalAudioVolume : number = 0.60,
    ) {

        ticksPerSecond = Math.max(1, ticksPerSecond) | 0;
        this.components = {

            controller: new Controller(controllerActions),
            audio: new AudioPlayer(audioCtx, globalAudioVolume),
            assets: new Assets(),
            tick: 1.0/ticksPerSecond/(1.0/60.0),
        }

        this.canvas = new RenderTarget(canvasWidth, canvasHeight, true);
    }


    private drawLoadingScreen() : void {

        const OUTLINE : number = 1;
        const WIDTH : number  = 80;
        const HEIGHT : number  = 12;

        const p : number = this.components.assets.getLoadRatio();

        const canvas : RenderTarget = this.canvas;

        const dx : number = canvas.width/2 - WIDTH/2;
        const dy : number = canvas.height/2 - HEIGHT/2;

        canvas.clearScreen("#000000");
        canvas.setColor("#ffffff");
        canvas.fillRect(dx, dy, WIDTH, HEIGHT);
        canvas.setColor("#000000");
        canvas.fillRect(dx + OUTLINE, dy + OUTLINE, WIDTH - OUTLINE*2, HEIGHT - OUTLINE*2);
        canvas.setColor("#ffffff");
        canvas.fillRect(dx + OUTLINE*2, dy + OUTLINE*2, (WIDTH - OUTLINE*4)*p, HEIGHT - OUTLINE*4);
    }


    public loop(ts : number) : void {

        const MAX_REFRESH_COUNT : number = 5; 
        const BASE_FRAME_TIME : number = 1000.0/60.0;
    
        const frameTime : number = BASE_FRAME_TIME*this.components.tick;
        const loaded : boolean = this.components.assets.loaded;

        this.timeSum = Math.min(
            this.timeSum + (ts - this.oldTime), 
            MAX_REFRESH_COUNT*frameTime);
        this.oldTime = ts;

        const refreshScreen : boolean = this.timeSum >= frameTime;
        let firstFrame : boolean = true;
        for (; this.timeSum >= frameTime; this.timeSum -= frameTime) {

            this.components.controller.preUpdate();

            if (this.initialized) {

                this.onUpdate();
            }

            if (loaded && !this.initialized) {
                
                this.onLoad();
                this.initialized = true;
            }
                
            if (firstFrame) {

                this.components.controller.postUpdate();
                firstFrame = false;
            }
        }

        if (refreshScreen) {

            if (loaded) {

                this.onRedraw();
            }
            else {

                this.drawLoadingScreen();
            }
        }

        window.requestAnimationFrame((ts : number) => this.loop(ts));
    }


    public run() : void {

        this.onInit();
        this.loop(0.0);
    }


    // NOTE: I could have onInit?() instead, but defining
    // these make some Closure warning go away (although I 
    // did lose 5 bytes in the process...)
    public onInit() : void {};
    public onLoad() : void {};
    public onUpdate() : void {};
    public onRedraw() : void {};
}
