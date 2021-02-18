class SkyMinigameController extends MinigameController { // All classes that can be added to the engine MUST extend EngineInstance

    onEngineCreate() { // called when the instance is made from a room.
        super.onEngineCreate();
        SkyMinigameController.score = 0;
        SkyMinigameController.nextBlock = 0;
        SkyMinigameController.timer = 0;
        SkyMinigameController.endTime = 20;
        SkyMinigameController.pCamY = 0;
        SkyMinigameController.nCamY = 0;
        SkyMinigameController.iBuffer = undefined
        SkyMinigameController.mingameTimer = undefined
        SkyMinigameController.maxScore = 32

        new SkyBuildPlayer($engine.getWindowSizeX()/2,0,0);
        new FallingTowerPlatform($engine.getWindowSizeX()/2,$engine.getWindowSizeY()-50);
        this.timer = 0;
        //$engine.setBackgroundColour(12067);
        $engine.setBackgroundColour(0xa58443);
        SkyMinigameController.iBuffer = new BufferedKeyInput('Space',8);
        this.f1 = new PIXI.filters.AdvancedBloomFilter();
        this.f1.bloomScale = 0.5;
        this.f1.brightness = 1;
        this.f1.blur = 3;
        this.f1.quality = 9;
        $engine.addFilter(this.f1);
        $engine.setOutcomeWriteBackValue(ENGINE_RETURN.LOSS);
        $engine.setCheatWriteBackValue(ENGINE_RETURN.NO_CHEAT);

        SkyMinigameController.mingameTimer = new MinigameTimer(60*5);
        SkyMinigameController.mingameTimer.addOnTimerStopped(this, function(parent, bool) {
            if(bool)
                $engine.setOutcomeWriteBackValue(ENGINE_RETURN.LOSS);
            else {
                $engine.setOutcomeWriteBackValue(ENGINE_RETURN.WIN);
            }
            $engine.startFadeOut(30,false)
            $engine.endGame();
        })

    }  
    onCreate() { // called when you construct the instance yourself
        this.onEngineCreate();
        super.onCreate();
    }

    step() {
        super.step();
        var timer = SkyMinigameController.timer;
        var endTime = SkyMinigameController.endTime;
        if(timer<=endTime) {
            $engine.getCamera().setY(EngineUtils.interpolate(timer/endTime,SkyMinigameController.pCamY,SkyMinigameController.nCamY,EngineUtils.INTERPOLATE_OUT));
        }
        SkyMinigameController.timer++;
    }

    onDestroy() {
        super.onDestroy();
        SkyMinigameController.iBuffer.destroy();
    }
}

class SkyBuildPlayer extends EngineInstance {

    onCreate(x,y,speed) {
        this.x = x;
        this.y = y;
        this.yStart = y;
        this.xStart = x;
        this.speed = speed;
        this.activated = true;
        this.nextnext = IM.find(SkyBuildPlayer, SkyMinigameController.nextBlock);
        this.setSprite(new PIXI.Sprite($engine.getTexture("falling_tower_1")))
        this.hitbox = new Hitbox(this,new RectangeHitbox(this,-50,0,50,100));
        this.dropping=false;
        this.randomOffset = EngineUtils.irandom(120);
        this.swingMove();
    }

    swingMove() {
        var controller = SkyMinigameController.getInstance();
        var val = controller.hasCheated() ? 0.5 : 1;
        var sin = Math.sin($engine.getGameTimer()/EngineUtils.clamp(32-SkyMinigameController.score * val,4,32) + this.randomOffset);
        this.angle = -sin/2;
        var angle2 = Math.PI*3/2+sin/2;
        this.x = this.xStart + V2D.lengthDirX(angle2,300);
        this.y = this.yStart + V2D.lengthDirY(angle2,300);
    }

    step() {
        this.y+=this.speed;
        
        if(this.y>$engine.getWindowSizeY()+100) {
            this.destroy();
        }
        IN.debugDisplayKeyPress(true); // makes the engine log every key press

        if(!this.dropping) {
            this.swingMove();
        } else {
            this.angle = 0;
        }
        var consume = SkyMinigameController.iBuffer.consume()

        if(this.activated == true && !this.dropping && consume) {
            this.dropping = true;
            this.speed+=5 + SkyMinigameController.score;
        }


        if(SkyMinigameController.score >= 1 && this.activated){
            var towers = IM.instanceCollisionList(this,this.x,this.y,this.nextnext);
            for(const tower of towers) { // don't use 'in', use 'of'
                if(tower.activated == false){
                    SkyMinigameController.mingameTimer.setTimeRemaining(60*5)
                    SkyMinigameController.score+= 1;
                    this.speed = 0;
                    this.activated = false;
                    SkyMinigameController.nextBlock += 1;
                    new SkyBuildPlayer($engine.getWindowSizeX()/2,64 - 100 * SkyMinigameController.score,0);
                    this.y = tower.hitbox.getBoundingBoxTop()-100;
                    tower.getSprite().tint = 0x444444;
                    if(SkyMinigameController.score>=3){
                        SkyMinigameController.endTime = EngineUtils.clamp(SkyMinigameController.endTime-1,5,20);
                        SkyMinigameController.pCamY=$engine.getCamera().getY();
                        SkyMinigameController.nCamY = -100 * (SkyMinigameController.score-3)-100;
                        SkyMinigameController.timer=0;
                    }
                    if(SkyMinigameController.score>=SkyMinigameController.maxScore) {
                        SkyMinigameController.mingameTimer.setGameComplete();
                    }

                    /*var bb1 = tower.hitbox.getBoundingBox();
                    var bb2 = this.hitbox.getBoundingBox();

                    bb2.x1 = Math.max(bb1.x1,bb2.x1)
                    bb2.x2 = Math.min(bb1.x2,bb2.x2)

                    this.hitbox.setHitbox(new RectangeHitbox(this,bb2.x1-this.x,bb2.y1-this.y,bb2.x2-this.x,bb2.y2-this.y))*/
                }
            }
        }
    }

    onDestroy() {
        $engine.setOutcomeWriteBackValue(ENGINE_RETURN.LOSS);
        $engine.startFadeOut(30,false)
        $engine.endGame();
    }

    draw(gui, camera) {
        //EngineDebugUtils.drawHitbox(camera,this)
        if(this.activated && !this.dropping)
            camera.lineStyle(3,0xe74c3c).moveTo(this.x,this.y).lineTo($engine.getWindowSizeX()/2,this.yStart);

    }
}



class FallingTowerPlatform extends SkyBuildPlayer {

    onCreate(x,y) {
        this.x = x;
        this.y = y;
        
        this.setSprite(new PIXI.Sprite($engine.getTexture("sky_platform")));
        this.hitbox = new Hitbox(this,new RectangeHitbox(this,-150,0,150,50));
    }

    step() {
        if(SkyMinigameController.score < 1){
            var towers = IM.instanceCollisionList(this,this.x,this.y,SkyBuildPlayer);
            for(const tower of towers) { // don't use 'in', use 'of'
                if(tower.activated == true){
                    SkyMinigameController.mingameTimer.setTimeRemaining(60*5)
                    SkyMinigameController.score+= 1;
                    tower.speed = 0;
                    tower.activated = false;
                    new SkyBuildPlayer($engine.getWindowSizeX()/2,64 - 100 * SkyMinigameController.score,0);
                    tower.y = this.hitbox.getBoundingBoxTop()-100;
                    this.getSprite().tint = 0x444444;
                }
            }
        }
  
    }
}