class FallingObjectsController extends MinigameController {
    onEngineCreate() {
        super.onEngineCreate();

        new ParallaxingBackground("background_sheet_2");

        var text = new PIXI.Text("Use Arrow Keys to walk left and right.\n Acquire CRUNCHY Leafs, Disregard the Earthy Clumps! \n\nPress ENTER to cheat!", $engine.getDefaultTextStyle());

        this.setInstructionRenderable(text);

        this.startTimer(30*60);
        this.player = new FallingObjectsPlayer($engine.getWindowSizeX()/2,$engine.getWindowSizeY()-32);

        this.fallTimer = 25;
        this.nextObject = 40;
        this.cameraShakeTimer = 0;
        this.dropArr = [0,1,2,3,4,5,6,7,8,9];

        this.score = 0;
        this.maxScore = 12;
        this.lives = 5;
        this.progressText = new PIXI.Text("",$engine.getDefaultSubTextStyle());
        $engine.createManagedRenderable(this,this.progressText);
        this.progressText.anchor.set(0.5,0.5);
        this.progressText.x = $engine.getWindowSizeX()/2;
        this.progressText.y = $engine.getWindowSizeY()-30;

        this.updateProgressText();
    }

    onCreate() {
        this.onEngineCreate();
        super.onCreate();
    }

    step() {
        super.step();
        this.fallTimer++;
        if(this.fallTimer>=this.nextObject) {
            this.fallTimer = 0;
           
            this.dropArr.sort(() => Math.random() - Math.random()).slice(0, 3);

            if(EngineUtils.irandomRange(0,100) >= 75){
                new FallingObject(26 + 80 * this.dropArr[0],-50,0);
            }else{
                new FallingObject(26 + 80 * this.dropArr[2],-50,1);
            }   
            

        }

        this.updateProgressText();
    }


    shakeCamera(fac) {
        this.cameraShakeTimer+=fac;
    }

    updateProgressText() {
        this.progressText.text = "Progress:  Leaves  "+String(this.score+" / "+String(this.maxScore + "   LIVES  " +String(this.lives+" / "+String(5))));
    }

    draw(gui,camera) {
        super.draw(gui,camera);
        $engine.requestRenderOnCameraGUI(this.progressText);
    }

    notifyFramesSkipped(frames) {
        this.minigameTimer.tickDown(frames);
    }
    
}

class FallingObjectsPlayer extends InstanceMover {
    onEngineCreate() {
        super.onEngineCreate();
        this.stunTimer=0;
        this.dx=0;
        this.hitbox = new Hitbox(this, new RectangleHitbox(this,-64,-464,64,-64))
        this.maxVelocity=14;
        this.turnLagStop=5;
        this.turnLag=1;
        this.hasBeenHurt=false;
        this.animationWalk = $engine.getAnimation("eson_walk");
        this.animationStand = [$engine.getTexture("eson_walk_0")];
        this.animation = $engine.createRenderable(this,new PIXI.extras.AnimatedSprite(this.animationStand));
        this.animation.animationSpeed = 0.1;

        this.xScale = 0.4;
        this.yScale = 0.4;

        this.baseXScale = this.xScale;

        this.depth = -2

        this.setSprite(this.animation);
    }

    onCreate(x,y) {
        this.x=x;
        this.y=y;
        this.onEngineCreate();
    }

    step() {
        this.animation.update(1)
        this.hasBeenHurt=false;
        super.step();
        this.stunTimer--;
        var accel = [0,0]
        if(IN.keyCheck("RPGright")) {
            accel[0]+=1.6;
        }
        if(IN.keyCheck("RPGleft")) {
            accel[0]-=1.6;
        }

        this.move(accel,this.vel);

        if(Math.abs(this.vel[0])<0.1) {
            EngineUtils.setAnimation(this.animation,this.animationStand);
        } else {
            EngineUtils.setAnimation(this.animation,this.animationWalk);
            this.animation.animationSpeed = this.vel[0]/(this.maxVelocity*7.5);
        }

        var sign = Math.sign(this.vel[0]);
        if(sign!==0)
            this.xScale = sign * this.baseXScale;

        this.animation.skew.x=-this.vel[0]/256;

       

        this.lmx = IN.getMouseXGUI();
        this.lmy = IN.getMouseYGUI();
    }

    canControl() {
        return true;
    }

    collisionCheck(x,y) {
        return x < 32 || x > $engine.getWindowSizeX() - 32;
    }

    preDraw() {
        if(this.hasBeenHurt) {
            this.getSprite().tint = 0xff0000;
        } else {
            this.getSprite().tint = 0xffffff;
        }
    }

    collisionCheckObject(x,y) {
        return x<=0+this.getSprite().width/2 || x>=$engine.getWindowSizeX()-this.getSprite().width/2 || y<=0+this.getSprite().height || y >= $engine.getWindowSizeY();
    }

    canControl() {
        return this.stunTimer<=0;
    }

    objectHit(obj) {
        if(!this.canControl())
            return;
        if(!obj.good) {
            this.stunTimer = 60;
            var dx = this.x-obj.x;
            var dy = 1;
            var angle = V2D.calcDir(dx,dy);
            var mag = 20;
            this.vel[0] = V2D.lengthDirX(angle,mag)/3;
            this.vel[1] = -V2D.lengthDirY(angle,mag)/3;
            FallingObjectsController.getInstance().changeScore(-4);
        } else {
            FallingObjectsController.getInstance().changeScore(1);
        }
        
    }

    draw(gui, camera) {
        EngineDebugUtils.drawHitbox(camera,this);
        //EngineDebugUtils.drawBoundingBox(camera,this);
    }
}

class FallingObject extends EngineInstance {

    onEngineCreate() {
        this.dx = EngineUtils.randomRange(-0.4,0.4);
        this.dy = EngineUtils.randomRange(10,13);
        this.warningTime = 65;

        this.hitbox = new Hitbox(this, new RectangleHitbox(this,-25,-25,25,25))
        var image = this.object ? "falling_object_spike" : "leaf_particles";
        var sign = this.object ? "falling_object_warning" : "falling_object_leaf";
        this.warning = new PIXI.Sprite($engine.getTexture(sign));
        this.warning.y = 200;
        this.warning.x = this.x;

        if(this.object == 0){
            this.setSprite(new PIXI.Sprite($engine.getRandomTextureFromSpritesheet(image)));
            this.yScale = 0.4;
            this.xScale = 0.4;
        }else{
            this.setSprite(new PIXI.Sprite($engine.getTexture(image)));
        }
    }

    onCreate(x,y,object) {
        this.x=x;
        this.y=y;
        this.object = object;
        this.onEngineCreate();
    }

    step() {
        this.warningTime--;
        if(this.warningTime > 0){
            this.warning.visible = true;
        }else{
            this.warning.visible = false;
            this.x+=this.dx;
            this.y+=this.dy;
        }


        if(this.y > $engine.getWindowSizeY() - 100){
            this.destroy();
        }
       

        if(IM.instanceCollision(this,this.x,this.y,FallingObjectsPlayer)) {
            if(this.object == 0){
                FallingObjectsController.getInstance().score++;
            }else{
                FallingObjectsController.getInstance().lives--;
            }
            //IM.find(FallingObjectsPlayer,0).hasBeenHurt = true;
            this.destroy();
        }

    }

    draw(gui,camera) {
        $engine.requestRenderOnGUI(this.warning);
        //EngineDebugUtils.drawHitbox(camera,this);
        //EngineDebugUtils.drawBoundingBox(camera,this);
    }
}
