class WaterMinigameController extends MinigameController {
    onEngineCreate() { 
        super.onEngineCreate();
        this.score = 12;
        this.maxScore = 12;
        this.penalty = 0;
        this.next = 0;

        new ParallaxingBackground("background_garden1");
    
        this.timer = 0;
        this.speedtimer = 0;
        this.speedmul = 0.008;
        this.attempts = 6;
        this.waiting = false;
        this.waitTimer = 0;

        
        this.startTimer(30*60);
        this.getTimer().setSurvivalMode();
        this.x = 149;
        this.y = $engine.getWindowSizeY() -180;

        var ddr_tiles = ["arrow_down", "arrow_left", "arrow_up", "arrow_right"];
        this.ddr_tiles = ddr_tiles;

        this.sprite0 = new PIXI.Sprite($engine.getTexture("arrow_down"));
        $engine.createRenderable(this, this.sprite0, true);
        this.sprite1 = new PIXI.Sprite($engine.getTexture("arrow_left"));
        $engine.createRenderable(this, this.sprite1, true);
        this.sprite1.dx = 120;


        this.sprite2 = new PIXI.Sprite($engine.getTexture("arrow_up"));
        $engine.createRenderable(this, this.sprite2, true);
        this.sprite2.dx = 240;
        this.sprite3 = new PIXI.Sprite($engine.getTexture("arrow_right"));
        $engine.createRenderable(this, this.sprite3, true);
        this.sprite3.dx = 360;

        var plant_array = [];
        this.plant_array = plant_array;

        var plant_sprites = ["plant_0", "plant_1", "plant_2", "plant_3"];
        this.plant_sprites = plant_sprites;

        new WaterCan(150, $engine.getWindowSizeY()/2 -170);

        this.shakeTimer = 0;
        this.shakeFactor = 8;

        for(var i = 0; i < 12; i++) {
            if(i < 3){
                plant_array[i] = new WaterPlant(90*2+200*i, $engine.getWindowSizeY()/2 -110, i);        
            }if(i >= 3 && i < 6){
                plant_array[i] = new WaterPlant(90*2+200*(i-3), $engine.getWindowSizeY()/2+25, i);        
            }if(i >= 6 && i < 9){
                plant_array[i] = new WaterPlant(90*3+200*(i-6), $engine.getWindowSizeY()/2 +90, i);
            }if(i >= 9 && i < 12){
                plant_array[i] = new WaterPlant(90*3+200*(i-9), $engine.getWindowSizeY()/2 -70, i);
            }
        }

        this.addOnCheatCallback(this, function(controller){
            controller.speedmul = 0;
            IM.with(DDRTiles, function(tile){
                tile.destroy();
            });
        });


        //this.hitbox = new Hitbox(this,new RectangleHitbox(this,-25,-37,25,37));

        var text = new PIXI.Text("NOT DONE INSTRUCTIONS!\nBasically\n WATER\n\n\nPress ENTER to cheat",$engine.getDefaultTextStyle());
        this.setInstructionRenderable(text);
        this.setControls(true,false);

        this.progressText = new PIXI.Text("",$engine.getDefaultSubTextStyle());
        $engine.createManagedRenderable(this,this.progressText);
        this.progressText.anchor.set(0.5,0.5);
        this.progressText.x = $engine.getWindowSizeX()/2;
        this.progressText.y = $engine.getWindowSizeY()-30;


        this.updateProgressText();
        this.randomPlantSelect();
    }

    handleShake() {
        var camera = $engine.getCamera();
        var fac = EngineUtils.interpolate(this.shakeTimer/this.shakeFactor,0,1,EngineUtils.INTERPOLATE_OUT_QUAD);
        camera.setRotation(EngineUtils.randomRange(-0.01,0.01)*fac);
        camera.setLocation(EngineUtils.irandomRange(-2,2) * fac, EngineUtils.irandomRange(-2,2) * fac);
        this.shakeTimer--;
    }

    shake(factor = 20) {
        if(this.shakeTimer < 0);
            this.shakeTimer=0;
        this.shakeTimer+=factor;
    }

    notifyFramesSkipped(frames) {
        this.getTimer().tickDown(frames);  
    }

    onCreate() { 
        super.onCreate();
        this.onEngineCreate();
    }

    step() {

        super.step();
        if(this.minigameOver()){
            return;
        }

        if(this.timer >= (30 -  this.speedtimer * this.speedmul)){
            new DDRTiles(149, 100, 0);
            this.timer = 0;
        }

        if(this.score <= 0){
            this.getTimer().pauseTimer();
            this.endMinigame(false);
        }

        this.tileHit();

        if(this.penalty > 0){
            this.penalty--;
        }

        this.updateProgressText();
        this.handleShake();
        this.timer++;
        this.speedtimer++;
    }

    randomPlantSelect(){
        this.index = EngineUtils.irandomRange(0, WaterMinigameController.getInstance().plant_array.length-1);
        this.plant = WaterMinigameController.getInstance().plant_array[this.index];
    }

    tileHit() {
        var current_tile = IM.find(DDRTiles, 0);
        if(current_tile === undefined || this.penalty != 0){
            return;
        }


        if($engine.getWindowSizeY() -220 <= current_tile.y && current_tile.y <= $engine.getWindowSizeY()){

            if(IN.keyCheckPressed("RPGright") && current_tile.arrow === 3){
                current_tile.getSprite().tint = (0xaaafff);
                WaterMinigameController.getInstance().next = 1;
                $engine.audioPlaySound("card_flip");
                current_tile.destroy();    
            }
            if(IN.keyCheckPressed("RPGleft") && current_tile.arrow === 1){
                current_tile.getSprite().tint = (0xaaafff);
                WaterMinigameController.getInstance().next = 1;
                $engine.audioPlaySound("card_flip");
                current_tile.destroy();
            }
            if(IN.keyCheckPressed("RPGdown") && current_tile.arrow === 0){
                current_tile.getSprite().tint = (0xaaafff);
                WaterMinigameController.getInstance().next = 1;
                $engine.audioPlaySound("card_flip");
                current_tile.destroy();
            }
            if(IN.keyCheckPressed("RPGup") && current_tile.arrow === 2){
                current_tile.getSprite().tint = (0xaaafff);
                WaterMinigameController.getInstance().next = 1;
                $engine.audioPlaySound("card_flip");
                current_tile.destroy();
            }
        }
        if((IN.keyCheckPressed("RPGright") && current_tile.arrow != 3) || (IN.keyCheckPressed("RPGleft") && current_tile.arrow != 1)
        || (IN.keyCheckPressed("RPGdown") && current_tile.arrow != 0) || (IN.keyCheckPressed("RPGup") && current_tile.arrow != 2)){
            this.penalty = 40;
            current_tile.getSprite().tint = (0xab1101);
        }  
    }


    updateProgressText() {
        this.progressText.text = "Progress:  Plants Alive  "+String(this.score+" / "+String(this.maxScore));
    }
  

    draw(gui, camera) {
        super.draw(gui, camera);     
        //EngineDebugUtils.drawHitbox(camera,this);
        $engine.requestRenderOnCameraGUI(this.progressText);
    }

}


class DDRTiles extends EngineInstance {
    onCreate(x,y) {
        this.depth = -10;
        this.arrow = EngineUtils.irandomRange(0,3);
        this.x = x + this.arrow*120;
        this.y = y;
        this.speed = 6;
        this.setSprite(new PIXI.Sprite($engine.getTexture(WaterMinigameController.getInstance().ddr_tiles[this.arrow])));
        this.clicked = false;
    }

    step(){
        this.y += this.speed;
        
        if(this.y - 24 >= $engine.getWindowSizeY() - 140){
            WaterMinigameController.getInstance().score--;
            WaterMinigameController.getInstance().shake();
            $engine.audioPlaySound("sky_donk");
            //var plant = IM.randomInstance(WaterPlant);
            var plant = WaterMinigameController.getInstance().plant;
            //console.log(plant.x, plant.y);
            plant.getSprite().texture = $engine.getTexture("plant_0");

            WaterMinigameController.getInstance().plant_array.splice(WaterMinigameController.getInstance().index, 1);

            this.destroy();
            WaterMinigameController.getInstance().next = 2;
        }
    }
}

class WaterPlant extends EngineInstance {
    onCreate(x,y,index) {
        this.x = x;
        this.y = y;
        this.index = index;
        this.score = 1;
        this.setSprite(new PIXI.Sprite($engine.getTexture(WaterMinigameController.getInstance().plant_sprites[EngineUtils.irandomRange(1,3)])));
        this.hitbox = new Hitbox(this,new RectangleHitbox(this,-25,-37,25,37));
        this.clicked = false;
    }
}

class WaterCan extends EngineInstance {
    onCreate(x,y) {
        this.timer = 0;
        this.endTime = 20;
        this.depth = -9;
        this.x = x;
        this.y = y;
        this.ex = x;
        this.ey = y;
        this.sx = this.x;
        this.sy = this.y;
        this.animation = $engine.createRenderable(this,new PIXI.extras.AnimatedSprite($engine.getAnimation("water_can_anim")));
        //this.animation.animationSpeed = 0.12;
        this.animation.animationSpeed = 0.2;
        //this.x = x-100;
        //this.y = y;
        this.setSprite(this.animation);
        //this.setSprite(new PIXI.Sprite($engine.getTexture("worm_5")));
    }

    step(){
        this.timer++;
        this.animation.update(1);
        if((WaterMinigameController.getInstance().next === 1 || WaterMinigameController.getInstance().next === 2) && WaterMinigameController.getInstance().plant_array.length >= 1){  
            //$engine.audioPlaySound("umbrella_rain_1");
            //$engine.audioPauseSound("umbrella_rain_1");
            WaterMinigameController.getInstance().randomPlantSelect();
            var plant = WaterMinigameController.getInstance().plant;
            //console.log(plant);

           
            this.ex = plant.x -50;
            this.ey = plant.y -60;

            this.sx = this.x;
            this.sy = this.y;
            WaterMinigameController.getInstance().next = 0;
            this.timer = 0;
        }

        

        if(this.x != this.ex && this.y != this.ey){
            this.x = EngineUtils.interpolate(this.timer/this.endTime,this.sx,this.ex,EngineUtils.INTERPOLATE_SMOOTH);
            this.y = EngineUtils.interpolate(this.timer/this.endTime,this.sy,this.ey,EngineUtils.INTERPOLATE_SMOOTH);
        }
        
    }
    

    draw(gui,camera) {
        //EngineDebugUtils.drawHitbox(camera,this);
        //EngineDebugUtils.drawBoundingBox(camera,this);
    }
}
