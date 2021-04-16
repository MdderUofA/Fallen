class GraffitiMinigameController extends MinigameController { // controls the minigame
    onEngineCreate() {
        super.onEngineCreate();
        this.instructiontext = $engine.createRenderable(this,new PIXI.Text("WAIT! " + String(60), $engine.getDefaultSubTextStyle()),false);
        this.instructiontext.anchor.x=0.5
        this.instructiontext.x = $engine.getWindowSizeX()/2;
        this.instructiontext.y = $engine.getWindowSizeY()-80;

        new ParallaxingBackground("background_wall_1");

        this.totalScore = 0;
        this.lastScore = 0;

        var text = new PIXI.Text("Use the left and right movement keys to\nchange the direction of the sponge.\n"
            + "Follow the lines as best as possible\n\nYou must clean at least 85/100 of all the graffiti on the wall.\n"
            + "Each graffiti gets it's own timer.\n\nPress ENTER to cheat!",$engine.getDefaultTextStyle());
        this.setInstructionRenderable(text);
        this.setControls(true,false);
        this.setCheatTooltip("Zoom zoom zoom zoom zoom!");
        this.skipPregame();

        this.reloadDrawings();
        this.graphicInd=-1;
        this.totalGraphics = this.images.length
        this.currentGraphic = undefined;
        this.targetTime = -1;

        this.averageScoreTotal = 0;
        this.countedScores = 0;

        this.winThreshold = 0.85; // 85%

        this.maxAllowedTime = 3600;

        this.timeToNextDroplet = EngineUtils.irandomRange(6,12);
        this.dropletContainer = $engine.createManagedRenderable(this, new PIXI.Sprite(PIXI.Texture.EMPTY))

        this.isWaiting = true;
        this.waitTimer = 60;

        this.currentTurnSpeed = 0;

        this.baseSpeed = 2;
        this.baseTurnRate = Math.PI/256; // 64 frames to turn around

        this.bufferTime = 0*60; // 0 extra seconds. (can cut corners)
        this.nextImageWaitTimer=99999;

        this.cheatFactor = 1;

        this.addOnCheatCallback(this, function(self) {
            self.cheatFactor = 3; // ZOOM ZOOM ZOOM
            self.currentTurnSpeed=0;
        })

        this.addOnGameStartCallback(this, function(self) {
            this.waitTimer = 0;
        })

        this.setupControllerGraphics();

        this.arrowGraphic = $engine.createRenderable(this, new PIXI.Sprite($engine.getTexture("arrow")))
        this.depth = -1;


        $engine.setCeilTimescale(true)
        this.nextGraphic();

        this.startTimer(this.targetTime)
        this.getTimer().pauseTimer();
        this.setPreventEndOnTimerExpire(true); // take direct control using below function
        this.getTimer().addOnTimerStopped(this, function(self) {
            self.onImageComplete();
        })
        this.getTimer().setWarningTime(3*60); // 3 seconds.
        this.wobble();

    }

    setupControllerGraphics() {
        this.setSprite(new PIXI.Sprite($engine.getTexture("sponge")));
        this.spongeMask = $engine.createManagedRenderable(this, new PIXI.Sprite($engine.getTexture("sponge_mask")));
    }

    renderToMasks() {
        this.spongeMask.x = this.x;
        this.spongeMask.y = this.y;
        this.spongeMask.scale.x = this.xScale;
        this.spongeMask.scale.y = this.yScale;
        this.spongeMask.rotation = this.angle;
        this.currentGraphic.render(this.spongeMask);
        IM.with(Droplet,function(drop) {
            drop.maskSprite.x = drop.x;
            drop.maskSprite.y = drop.y;
            drop.maskSprite.rotation = drop.angle;
            drop.maskSprite.xScale = drop.xScale;
            drop.maskSprite.alpha = drop.alpha;
        })
        this.currentGraphic.render(this.dropletContainer)
    }

    onImageComplete() {
        this.nextImageWaitTimer = 240;
        this.waitTimer=this.maxAllowedTime
        this.images[this.graphicInd].calculateScore()
        IM.destroy(Droplet)
        this.isWaiting=true;
        this.checkCanWin();
    }

    checkCanWin() {
        if(this.totalGraphics - this.graphicInd===1)
            return; // last drawing
        var test = this.averageScoreTotal;
        test+= this.totalGraphics - this.graphicInd-1;
        test/=this.totalGraphics;
        if(test<this.winThreshold) {
            this.endMinigame(false);
            this.setLossReason("Now that's just a sad display.")
        }
    }

    finishMinigame() {
        var won = this.averageScoreTotal/this.countedScores>=this.winThreshold;
        if(!won) {
            var wonDrawing = $engine.getSaveData().drawingMinigameResult; // whether they won drawing minigame v1 or not
            if(wonDrawing === undefined)
                wonDrawing = true;
            if(!wonDrawing) // they lost drawing last time
                this.setLossReason("Try following the lines next t- Really? Again??")
            else
                this.setLossReason("Try following the lines next time")
        }
        this.endMinigame(won);
    }

    getLastScore() {
        return this.lastScore;
    }

    onCreate() {
        this.onEngineCreate();
    }

    reloadDrawings() {
        var data = $engine.getSaveData().drawingMinigameLines;
        if(!data) { // testing
            data = [];
            data.push({
                line:ShapeToDraw.paths[0].path,
                distance:ShapeToDraw.paths[0].dist
            })
            data.push({
                line:ShapeToDraw.paths[1].path,
                distance:ShapeToDraw.paths[1].dist
            })
            data.push({
                line:ShapeToDraw.paths[2].path,
                distance:ShapeToDraw.paths[2].dist
            })
        }
        this.images = [];
        for(var i=0;i<3;i++) {
            this.images.push(new ShapeToClean(data[i]))
        }
    }

    nextGraphic() {
        this.graphicInd++;
        if(this.graphicInd>=this.totalGraphics) {
            this.images[this.graphicInd].setVisible(false)
            this.currentGraphic=undefined;
            return;
        }

        IM.destroy(Droplet)

        if(this.graphicInd>0) {
            this.images[this.graphicInd-1].setVisible(false)
        }
        this.currentGraphic = this.images[this.graphicInd];
        this.currentGraphic.setVisible(true)
        this.isWaiting=true;
        this.waitTimer=0;

        if(this.graphicInd>=this.totalGraphics-1) {
            this.done = true;
        }

        this.targetTime = this.currentGraphic.getDistance() / this.baseSpeed + this.bufferTime; // time to clean + buffer.
        if(this.targetTime>this.maxAllowedTime)
            this.targetTime=this.maxAllowedTime;

        $engine.audioPlaySound("draw_start")
        
        var loc = this.currentGraphic.getStartLocation();
        this.x = loc.x + $engine.getWindowSizeX()/2;
        this.y = loc.y + $engine.getWindowSizeY()/2;
        this.currentDirection = this.currentGraphic.getStartAngle();
        this.currentTurnSpeed = 0;
        this.updateArrow();
    }

    step() {
        super.step();
        if(this.minigameOver())
            return;

        this.waitTimer++;
        if(this.waitTimer<150) {
            if(this.waitTimer<=60) {
                this.instructiontext.alpha=1;
                this.instructiontext.text = "WAIT! " + String(60-this.waitTimer)
            } else {
                this.isWaiting=false;
                this.getTimer().unpauseTimer();
                this.instructiontext.text = "GO!!!!"
                this.instructiontext.alpha = 1-(this.waitTimer-60)/40 + Math.sin(this.waitTimer/2)/2
            }
        } else if(this.waitTimer > this.maxAllowedTime){
            var score = this.getLastScore()*100;
            this.instructiontext.text = "Percent cleaned: "+String(score).substring(0,4) + "\n" + (score >= this.winThreshold*100 ? "PASS!" : "FAIL!")
                 + "\nCurrent average score: "+String(this.averageScoreTotal/this.countedScores*100).substring(0,4);
            this.instructiontext.alpha = 1;
        }

        this.wobble();
            this.updateArrow()

        if(!this.isWaiting) {
            this.handleMove();
            this.handleDroplets();
            this.renderToMasks();
        }
        this.awaitNextImage();
    }

    awaitNextImage() {
        if(--this.nextImageWaitTimer<=0) {
            console.log(this.graphicInd)
            if(!this.done) {
                this.nextGraphic();
                this.getTimer().restartTimer(this.targetTime)
                this.getTimer().pauseTimer();
            } else {
                this.finishMinigame();
            }
            this.nextImageWaitTimer=99999;
        }
    }

    handleDroplets() {
        if(--this.timeToNextDroplet<=0) {
            this.timeToNextDroplet = EngineUtils.irandomRange(6,12);
            new Droplet(this.x+EngineUtils.randomRange(-12,12),this.y+EngineUtils.randomRange(-12,12));
        }
    }

    handleMove() {
        if(IN.keyCheck("RPGright")) {
            if(this.hasCheated()) {
                this.currentDirection+=this.baseTurnRate * 12; // direct
            } else {
                this.currentTurnSpeed+=this.baseTurnRate;
            }
        }
        if(IN.keyCheck("RPGleft")) {
            if(this.hasCheated()) {
                this.currentDirection-=this.baseTurnRate * 12; // direct
            } else {
                this.currentTurnSpeed-=this.baseTurnRate;
            }
        }
        this.currentDirection+=this.currentTurnSpeed;
        this.currentTurnSpeed*=0.965
        var xMove = Math.cos(this.currentDirection) * this.baseSpeed * this.cheatFactor;
        var yMove = Math.sin(this.currentDirection) * this.baseSpeed * this.cheatFactor;
        if(this.x+xMove < 0 || this.x + xMove > $engine.getWindowSizeX()) {
            this.currentDirection = V2D.mirrorAngle(this.currentDirection,0);
            xMove = -xMove;
        }
        if(this.y+yMove < 0 || this.y + yMove > $engine.getWindowSizeY()) {
            this.currentDirection = V2D.mirrorAngle(this.currentDirection,Math.PI/2);
            yMove = -yMove;
        }

        this.x+=xMove
        this.y+=yMove
    }

    wobble() {
        var fac = 0.6;
        if(this.hasCheated()) {
            fac = 1;
        }
        this.xScale = fac+Math.sin($engine.getGameTimer()/13)/12;
        this.yScale = fac+Math.sin($engine.getGameTimer()/13+10)/12;
        this.angle = Math.cos($engine.getGameTimer()/16)/8;
    }

    notifyFramesSkipped(frames) {
        //do nothing.
    }

    draw(gui, camera) {
        super.draw(gui, camera);
        $engine.requestRenderOnCamera(this.instructiontext);
    }

    updateArrow() {
        var constOffset = 12
        var offsetFactor = 30
        var dir = this.currentDirection;
        var fac2 = Math.abs(Math.sin($engine.getGameTimer()/16))/8 + 0.25
        this.arrowGraphic.scale.set(fac2)
        this.arrowGraphic.x = this.x + V2D.lengthDirX(dir,constOffset+fac2*offsetFactor);
        this.arrowGraphic.y = this.y - V2D.lengthDirY(dir,constOffset+fac2*offsetFactor);
        this.arrowGraphic.rotation = dir;
    }

    getDropletContainer() {
        return this.dropletContainer;
    }

    notifyScore(score) {
        this.lastScore = score;
        this.averageScoreTotal += score;
        this.countedScores++;
    }

}

class BubbleParticle extends EngineInstance {

}

class Droplet extends EngineInstance {
    onCreate(x,y) {
        this.depth = -2;
        this.dy = 0;
        this.grav = 0.25;
        this.angle = Math.PI/2;
        this.x = x;
        this.y = y;
        var idx = EngineUtils.irandom(2);
        this.maskSprite = new PIXI.Sprite($engine.getTexture("drop_sprites_"+String(idx+3)));
        GraffitiMinigameController.getInstance().getDropletContainer().addChild(this.maskSprite); // for fast rendering
        this.sprite = $engine.createRenderable(this, new PIXI.Sprite($engine.getTexture("drop_sprites_"+String(idx))),true);
        this.lifeTime = EngineUtils.irandomRange(30,50);
        this.lifeTimer=0;
        this.yScale = 0.5;
        this.fadeTime = EngineUtils.irandomRange(5,20);
    }

    step() {
        this.y+=this.dy;
        this.dy+=this.grav;
        this.xScale = EngineUtils.clamp(this.dy,0,1.5)
        if(this.lifeTimer>this.lifeTime) {
            this.destroy();
        }
        if(this.lifeTimer>=this.lifeTime-this.fadeTime) {
            this.alpha = EngineUtils.interpolate((this.lifeTimer-(this.lifeTime-this.fadeTime))/this.fadeTime,1,0,EngineUtils.INTERPOLATE_OUT);
        }
        this.lifeTimer++
    }

    onDestroy() {
        GraffitiMinigameController.getInstance().getDropletContainer().removeChild(this.maskSprite);
    }

}

class ShapeToClean extends EngineInstance {

    onCreate(data) {
        if(data.distance===-1)
            return;

        this.distance = data.distance;
        this.startLocation = data.line[0]
        var nextPoint = data.line[1];
        if(nextPoint) { // edge case of 1 long line.
            this.startAngle = V2D.calcDir(nextPoint.x - this.startLocation.x, nextPoint.y - this.startLocation.y);
        } else {
            this.startAngle=0;
        }
        

        this.percentCleaned = -1;

        this.createImages(data.line);

        this.setVisible(false);
        
    }

    setVisible(bool) {
        // save the poor GPU
        this.showing = bool;
        this.sprite.visible = bool;
        this.maskSprite.visible=bool;
        this.waterMaskSprite.visible=bool;
        this.waterSprite.visible=bool
    }

    render(spr) {
        spr.tint = 0;
        if(spr.children) {
            for(const child of spr.children)
                child.tint = 0;
        }
        $engine.getRenderer().render(spr,this.renderTextureClean1,false,null,false);
        spr.tint = 0xffffff;
        if(spr.children) {
            for(const child of spr.children)
                child.tint = 0xffffff;
        }
        $engine.getRenderer().render(spr,this.renderTextureClean2,false,null,false);
    }

    getStartLocation() {
        return this.startLocation
    }

    getStartAngle() {
        return this.startAngle
    }

    getDistance() {
        return this.distance
    }

    createImages(points) {
        var graphics = new PIXI.Graphics();
        var colourOuter = 0xdfdfdf
        var colourInner = 0xbfbfbf

        graphics.x = $engine.getWindowSizeX()/2;
        graphics.y = $engine.getWindowSizeY()/2;

        graphics.moveTo(points[0].x,points[0].y);
        graphics.lineStyle(12,colourOuter)
        for(var i =1;i<points.length-1;i++) {
            var xc = (points[i].x + points[i + 1].x) / 2;
            var yc = (points[i].y + points[i + 1].y) / 2;
            graphics.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        graphics.lineTo(points[points.length-1].x,points[points.length-1].y)

        graphics.moveTo(points[0].x,points[0].y);
        graphics.lineStyle(4,colourInner)
        for(var i =1;i<points.length-1;i++) {
            var xc = (points[i].x + points[i + 1].x) / 2;
            var yc = (points[i].y + points[i + 1].y) / 2;
            graphics.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        graphics.lineTo(points[points.length-1].x,points[points.length-1].y)

        graphics.lineStyle(0,colourOuter)
        graphics.beginFill(colourOuter);
        graphics.drawCircle(points[0].x,points[0].y,5)
        graphics.drawCircle(points[points.length-1].x,points[points.length-1].y,5)
        graphics.endFill();

        // score texture
        this.renderTexture = $engine.createManagedRenderable(this, PIXI.RenderTexture.create(816,624));

        // mask texture (for line itself)
        this.renderTextureClean1 = $engine.createManagedRenderable(this, PIXI.RenderTexture.create(816,624));

        // mask texture (for water)
        this.renderTextureClean2 = $engine.createManagedRenderable(this, PIXI.RenderTexture.create(816,624));

        // temp result texture (for calculating score)
        this.renderTextureResult = $engine.createManagedRenderable(this, PIXI.RenderTexture.create(816,624));

        // used to clear the pixel buffer
        var whiteGraphics = new PIXI.Graphics();
        whiteGraphics.beginFill(0xffffff);
        whiteGraphics.drawRect(0,0,$engine.getWindowSizeX(),$engine.getWindowSizeY());
        whiteGraphics.endFill();

        var blackGraphics = new PIXI.Graphics();
        blackGraphics.beginFill(0);
        blackGraphics.drawRect(0,0,$engine.getWindowSizeX(),$engine.getWindowSizeY());
        blackGraphics.endFill();

        // render the line to the render tex
        $engine.getRenderer().render(graphics,this.renderTexture,false,null,false);

        // set up our masks
        $engine.getRenderer().render(whiteGraphics,this.renderTextureClean1,false,null,false);
        $engine.getRenderer().render(blackGraphics,this.renderTextureClean2,false,null,false);

        // delete the temporary graphics
        $engine.freeRenderable(graphics);
        $engine.freeRenderable(whiteGraphics);
        $engine.freeRenderable(blackGraphics);

        this.sprite = $engine.createRenderable(this, new PIXI.Sprite(this.renderTexture));
        this.maskSprite = $engine.createRenderable(this, new PIXI.Sprite(this.renderTextureClean1));
        this.sprite.mask = this.maskSprite;

        this.waterMaskSprite = $engine.createRenderable(this, new PIXI.Sprite(this.renderTextureClean2));
        this.waterSprite = $engine.createRenderable(this, new PIXI.extras.TilingSprite($engine.getTexture("water_tile"),816,624))
        this.waterSprite.anchor.set(0)
        this.waterSprite.mask=this.waterMaskSprite;

        this.calculateBaseline(this.renderTexture);
    }

    calculateBaseline(renderTexture) {
        var pixels = $engine.getRenderer().plugins.extract.pixels(renderTexture);
        var baseline = 0;
        for(var yy = 0;yy<624;yy++) {
            for(var xx = 0;xx<816;xx++) {
                baseline += pixels[(xx + yy*816)<<2] // count the number of pixels in terms of how grey they are.
            }
        }
        this.baselineScore = baseline;
    }

    calculateScore() {
        $engine.getRenderer().render(this.sprite,this.renderTextureResult,false,null,false); // render the result to the temp render tex
        var pixels = $engine.getRenderer().plugins.extract.pixels(this.renderTextureResult);
        var count = 0;
        for(var yy = 0;yy<624;yy++) {
            for(var xx = 0;xx<816;xx++) {
                count += pixels[(xx + yy*816)<<2] // count the number of pixels in terms of how grey they are.
            }
        }
        this.percentCleaned = 1 - (count / this.baselineScore);
        GraffitiMinigameController.getInstance().notifyScore(this.percentCleaned);
    }
}