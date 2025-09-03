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
        controllerActions : ActionConfig[]) {

        this.components = {

            controller: new Controller(controllerActions),
            audio: new AudioPlayer(audioCtx),
            assets: new Assets(),
            tick: 1.0,
        }

        this.canvas = new RenderTarget(canvasWidth, canvasHeight, true);
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

                this.onUpdate?.();
            }

            if (loaded && !this.initialized) {
                
                this.onLoad?.();
                this.initialized = true;
            }
                
            if (firstFrame) {

                this.components.controller.postUpdate();
                firstFrame = false;
            }
        }

        if (refreshScreen && loaded) {

            this.onRedraw?.();
        }

        window.requestAnimationFrame((ts : number) => this.loop(ts));
    }


    public run() : void {

        this.onInit?.();
        this.loop(0.0);
    }


    public onInit?() : void;
    public onLoad?() : void;
    public onUpdate?() : void;
    public onRedraw?() : void;
}
