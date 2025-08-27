import { Vector } from "./vector.js";
import { Assets } from "./assets.js";
import { Bitmap, Flip, RenderTarget } from "./gfx.js";
import { ProgramComponents } from "./program.js";
import { BitmapIndex, Controls } from "./mnemonics.js";
import { approachValue } from "./utility.js";
import { ActionState, InputState } from "./controller.js";
import { Dust } from "./dust.js";


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
    private canDoubleJump : boolean = false;

    private dust : Dust[];
    private dustTimer : number = 0.0;


    constructor(x : number, y : number) {

        this.pos = new Vector(x, y);

        this.speed = Vector.zero();
        this.speedTarget = Vector.zero();
        this.friction = new Vector(0.20, 0.15);

        this.dust = new Array<Dust> ();
    }


    private controlJumping(comp : ProgramComponents) : void {

        const JUMP_TIME : number = 14.0;
        const DOUBLE_JUMP_TIME : number = 8.0;

        const jumpButton : ActionState = comp.controller.getAction(Controls.Jump);
        if (jumpButton.state == InputState.Pressed) {

            const canJumpNormally : boolean = this.ledgeTimer > 0.0;
            if (canJumpNormally || this.canDoubleJump) {  

                if (!canJumpNormally) {

                    this.canDoubleJump = false;
                }

                this.jumpTimer = canJumpNormally ? JUMP_TIME : DOUBLE_JUMP_TIME;
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


    private animateSprite(start : number, end : number, frameTime : number, tick : number) : void {

        if (this.frame < start || this.frame > end) {

            this.frame = start;
            this.animationTimer = 0.0;
        }

        this.animationTimer += tick;
        if (this.animationTimer >= frameTime) {

            ++ this.frame;
            if (this.frame > end) {

                this.frame = start;
            }
            this.animationTimer = 0.0;
        }
    }


    private animate(tick : number) : void {

        const JUMP_ANIM_THRESHOLD : number = 0.5;
        const DOUBLE_JUMP_ANIMATION_MAX_SPEED : number = 1.0;

        if (!this.touchSurface) {

            if (!this.canDoubleJump && 
                this.speed.y < DOUBLE_JUMP_ANIMATION_MAX_SPEED) {

                this.animateSprite(6, 9, 4, tick);
                return;
            }

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

            const frameTime : number = (12 - Math.abs(this.speed.x)*4) | 0;
            this.animateSprite(0, 3, frameTime, tick);
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


    private updateDust(baseSpeed : number, tick : number) : void {

        const DUST_TIME : number = 5.0;

        for (const d of this.dust) {

            d.update(baseSpeed, tick);
        }

        if (Math.abs(this.speed.x) < 0.01 && this.touchSurface) {

            this.dustTimer = 0.0;
            return;
        }

        this.dustTimer += tick;
        if (this.dustTimer >= DUST_TIME) {

            let dust : Dust | undefined = undefined;
            for (const d of this.dust) {

                if (!d.doesExist()) {

                    dust = d;
                    break;
                }
            }
            if (dust == null) {

                dust = new Dust();
                this.dust.push(dust);
            }
            dust!.spawn(this.pos.x, this.pos.y + 4, 1.0/45.0, 6);

            this.dustTimer -= DUST_TIME;
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


    public update(baseSpeed : number, comp : ProgramComponents) : void {

        this.control(comp);
        this.move(comp.tick);
        this.checkWallCollisions();
        this.animate(comp.tick);
        this.updateTimers(comp.tick);
        this.updateDust(baseSpeed, comp.tick);

        this.touchSurface = false;

        // TEMP!
        if (this.pos.y > 192 + 8) {

            this.pos.y -= 192 + 16;
        }
    }


    public preDraw(canvas : RenderTarget) : void {

        for (const d of this.dust) {

            d.draw(canvas);
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

        const LEDGE_TIME : number = 8.0;

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
            this.canDoubleJump = true;

            return true;
        }
        return false;
    }
}