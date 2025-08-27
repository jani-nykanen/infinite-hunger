import { Vector } from "./vector.js";
import { Assets } from "./assets.js";
import { Bitmap, Flip, RenderTarget } from "./gfx.js";
import { ProgramComponents } from "./program.js";
import { BitmapIndex, Controls } from "./mnemonics.js";
import { approachValue } from "./utility.js";
import { ActionState, InputState } from "./controller.js";


export class Player {


    private pos : Vector;
    private speed : Vector;
    private speedTarget : Vector;
    private friction : Vector;

    private frame : number = 0;
    private animationTimer : number = 0;
    private flip : Flip = Flip.None;
    private touchSurface : boolean = false;

    private jumpTimer : number = 0.0;
    private ledgeTimer : number = 0.0;


    constructor(x : number, y : number) {

        this.pos = new Vector(x, y);

        this.speed = Vector.zero();
        this.speedTarget = Vector.zero();
        this.friction = new Vector(0.20, 0.15);
    }


    private controlJumping(comp : ProgramComponents) : void {

        const JUMP_TIME : number = 14.0;

        const jumpButton : ActionState = comp.controller.getAction(Controls.Jump);
        if (jumpButton.state == InputState.Pressed) {

            if (this.ledgeTimer > 0.0) {

                this.jumpTimer = JUMP_TIME;
                this.touchSurface = false;
                this.ledgeTimer = 0.0;
            }
        }
        else if (this.jumpTimer > 0 && (jumpButton.state & InputState.DownOrPressed) == 0) {

            this.jumpTimer = 0.0;
        }
    }


    private control(comp : ProgramComponents) : void {

        const RUN_SPEED : number = 1.4;
        const BASE_GRAVITY : number = 4.0;

        let moveDir : number = 0;
        const left : ActionState = comp.controller.getAction(Controls.Left);
        const right : ActionState = comp.controller.getAction(Controls.Right);
        const maxStamp : number = Math.max(left.timestamp, right.timestamp);

        if ((left.state & InputState.DownOrPressed) != 0 && left.timestamp >= maxStamp) {

            moveDir = -1;
            this.flip = Flip.Horizontal;
        }
        else if ((right.state & InputState.DownOrPressed) != 0 && right.timestamp >= maxStamp) {

            moveDir = 1;
            this.flip = Flip.None;
        }

        this.speedTarget.x = moveDir*RUN_SPEED;
        this.speedTarget.y = BASE_GRAVITY;

        this.controlJumping(comp);
    }


    private move(tick : number) : void {

        this.speed.x = approachValue(this.speed.x, this.speedTarget.x, this.friction.x*tick);
        this.speed.y = approachValue(this.speed.y, this.speedTarget.y, this.friction.y*tick);

        this.pos.x += this.speed.x*tick;
        this.pos.y += this.speed.y*tick;
    }


    private animate(tick : number) : void {

        const JUMP_ANIM_THRESHOLD : number = 0.5;

        if (!this.touchSurface) {

            let frame : number = 0;
            if (this.speed.y < -JUMP_ANIM_THRESHOLD) {

                frame = 4;
            }
            else if (this.speed.y > JUMP_ANIM_THRESHOLD) {

                frame = 5;
            }
            this.frame = frame;
            return;
        }

        const idle : boolean = Math.abs(this.speedTarget.x) < 0.01;
        if (idle) {

            this.frame = 0;
        }
        else {

            if (this.frame > 3) {

                this.frame = 0;
                this.animationTimer = 0.0;
            }

            const frameTime : number = (12 - Math.abs(this.speed.x)*4) | 0;

            this.animationTimer += tick;
            if (this.animationTimer >= frameTime) {

                this.frame = (this.frame + 1) % 4;
                this.animationTimer = 0.0;
            }
        }
    }


    private updateTimers(tick : number) : void {

        const JUMP_SPEED : number = -2.5;

        if (this.ledgeTimer > 0.0) {

            this.ledgeTimer -= tick;
        }

        if (this.jumpTimer > 0.0) {

            this.speed.y = JUMP_SPEED;
            this.jumpTimer -= tick;
        }
    }


    private checkWallCollisions() : void {

        const COLLISION_WIDTH : number = 8;

        if (this.speed.x < 0.0 && this.pos.x < 16 + COLLISION_WIDTH/2) {

            this.pos.x = 16 + COLLISION_WIDTH/2;
            this.speed.x = 0.0;
        }
        else if (this.speed.x > 0.0 && this.pos.x > 240 - COLLISION_WIDTH/2) {

            this.pos.x = 240 - COLLISION_WIDTH/2;
            this.speed.x = 0.0;
        }
    }


    public update(comp : ProgramComponents) : void {

        this.control(comp);
        this.move(comp.tick);
        this.checkWallCollisions();
        this.animate(comp.tick);
        this.updateTimers(comp.tick);

        this.touchSurface = false;

        // TEMP!
        if (this.pos.y > 192 + 8) {

            this.pos.y -= 192 + 16;
        }
    }


    public draw(canvas : RenderTarget, assets : Assets) : void {

        const bmp : Bitmap = assets.getBitmap(BitmapIndex.GameObjects);

        const dx : number = this.pos.x - 8;
        const dy : number = this.pos.y - 7;

        canvas.drawBitmap(bmp, this.flip, dx, dy, this.frame*16, 0, 16, 16);
    }


    public floorCollision(x : number, y : number, width : number, platformSpeed : number, tick : number) : boolean {

        const COLLISION_WIDTH : number = 8;
        const COLLISION_HEIGHT : number = 8;
        const SPEED_THRESHOLD : number = -0.25;

        const LEDGE_TIME : number = 6.0;

        const TOP_CHECK_AREA : number = 2.0;
        const BOTTOM_CHECK_AREA : number = 4.0;

        if (this.speed.y < SPEED_THRESHOLD) {

            return false;
        }

        const left : number = this.pos.x - COLLISION_WIDTH/2;
        const right : number = this.pos.x + COLLISION_WIDTH/2;

        if (right < x || left >= x + width) {

            return false;
        }

        const bottom : number = this.pos.y + COLLISION_HEIGHT;
        const absSpeed : number = Math.abs(this.speed.y);

        if (bottom >= y - TOP_CHECK_AREA*tick && bottom <= y + (BOTTOM_CHECK_AREA + absSpeed)*tick) {

            this.pos.y = y - COLLISION_HEIGHT;
            this.speed.y = platformSpeed;

            this.ledgeTimer = LEDGE_TIME;
            this.touchSurface = true;

            return true;
        }
        return false;
    }
}