/** @type {Scene_Engine} */
var $engine;

var $__engineData = {}
$__engineData.__textureCache = {};
$__engineData.__spritesheets = {};
$__engineData.__haltAndReturn = false;
$__engineData.__ready = false;
$__engineData.__debugRequireTextures = false;
$__engineData.__outcomeWriteBackValue = -1
$__engineData.outcomeWriteBackIndex = -1;
$__engineData.__cheatWriteBackValue = -1
$__engineData.cheatWriteBackIndex = -1;
$__engineData.loadRoom = "MenuIntro";

$__engineData.__debugPreventReturn = false;
$__engineData.__debugLogFrameTime = false;

const ENGINE_RETURN = {};
ENGINE_RETURN.LOSS = 0;
ENGINE_RETURN.WIN = 1;
ENGINE_RETURN.NO_CHEAT = 0;
ENGINE_RETURN.CHEAT = 1;

const SET_ENGINE_ROOM = function(room) {
    $__engineData.loadRoom = room;
}

const SET_ENGINE_RETURN = function(indexOutcome, indexCheat) {
    $__engineData.outcomeWriteBackIndex = indexOutcome;
    $__engineData.cheatWriteBackIndex = indexCheat;
}

const ENGINE_START = function() {
    SceneManager.push(Scene_Engine);
}

//PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST; // set PIXI to render as nearest neighbour

/*DEBUG CODE MANIFEST (REMOVE ALL BEFORE LAUNCH):
IN: keydown listener will put you into engine on "ctrl + enter" press
IN: log key press code
Scene_Engine - debug_log_frame_time (create, doSimTick)
*/

class Scene_Engine extends Scene_Base {

    create() {
        super.create();
        this.__initEngine();
    }

    __initEngine() {
        $engine = this;
        this.__gamePaused = false;
        this.__filters = [];
        this.filters = []; // PIXI
        this.__enabledCameras = [true,false];
        this.__cameras=[new Camera(0,0,Graphics.boxWidth,Graphics.boxHeight,0)];
        this.__GUIgraphics = new PIXI.Graphics();
        this.__shouldChangeRooms=false;
        this.__nextRoom="";
        this.__currentRoom = undefined;
        this.__globalTimer = 0;
        this.__gameTimer = 0;
        this.__instanceCreationSpecial = {}; // it doesn't matter what this is so long as it's an object.
        

        this.debugLogFrameTime = false;

        this.__background = undefined;
        this.__backgroundColour = 0;
        this.__usingSolidColourBackground = true;
        this.__autoDestroyBackground = false;
        this.__backgroundContainer = new PIXI.Container();
        this.setBackground(new PIXI.Graphics(), true)

        this.addChild(this.__backgroundContainer);
        this.addChild(this.__cameras[0]);
        this.addChild(this.__GUIgraphics)
        IM.__initializeVariables();
    }

    start() {
        this.__startEngine();
    }

    __startEngine() {
        this.__setRoom($__engineData.loadRoom);
        IN.__forceClear();
    }

    update() {
        // RPG MAKER
        super.update();
        if($__engineData.__haltAndReturn && ! this.isBusy())
            this.__endAndReturn()

        if(this.isBusy() || SceneManager.isSceneChanging()) // fix for one frame SceneManager bug
            return;

        // ENGINE
        if(this.__shouldChangeRooms)
            this.__setRoom(this.__nextRoom);

        IN.__update();
        this.__doSimTick();
        
        if(!this.__gamePaused)
            this.__gameTimer++;
        this.__globalTimer++;
    }

    setRoom(newRoom) {
        if(!RoomManager.roomExists(newRoom))
            throw new Error("Attemping to change to non existent room "+newRoom);
        if(this.shouldChangeRooms)
            return;
        this.__shouldChangeRooms=true;
        this.__nextRoom = newRoom;
    }

    __setRoom(roomName) {
        IM.__endRoom();
        for(var i = this.__filters.length-1;i>=0;i--) {
            if(this.__filters[i].remove) {
                this.removeFilter(this.__filters[i].filter);
            }
        }
        this.__currentRoom = RoomManager.loadRoom(roomName);
        IM.__startRoom();
        this.__shouldChangeRooms=false;
    }

    /** @returns {Camera} The camera */
    getCamera() {
        return this.__cameras[0];
    }

    getRenderer() { // for low level PIXI operations
        return Graphics._renderer;
    }

    endGame() {
        $__engineData.__haltAndReturn=true;
    }

    setOutcomeWriteBackValue(value) {
        $__engineData.__outcomeWriteBackValue=value;
    }

    setCheatWriteBackValue(value) {
        $__engineData.__cheatWriteBackValue=value;
    }

    pauseGame() {
        this.__gamePaused = true;
    }

    unpauseGame() {
        this.__gamePaused = false;
    }

    isGamePaused() {
        return this.__gamePaused;
    }


    __endAndReturn() {
        // for testing minigames.
        if($__engineData.__debugPreventReturn) {
            this.__cleanup();
            this.removeChildren();
            this.__initEngine();
            this.__startEngine();
            $__engineData.__haltAndReturn=false;
            return;
        }
        $__engineData.__haltAndReturn=false;
        SceneManager.pop();
    }

    // called exclusively by terminate, which is called from RPG maker.
    __cleanup() {
        this.__GUIgraphics.removeChildren(); // prevent bug if you rendered to the GUI
        this.freeRenderable(this.__GUIgraphics)
        this.freeRenderable(this.__backgroundContainer);
        IM.__endGame() // frees all renderables associated with instances
        for(const camera of this.__cameras) {
            this.freeRenderable(camera);
            this.freeRenderable(camera.getCameraGraphics());
        }
    }

    __writeBack() {
        if($__engineData.outcomeWriteBackIndex!==-1) {
            if($__engineData.__outcomeWriteBackValue<0)
                throw new Error("Engine expects a non negative outcome write back value");
            $gameVariables.setValue($__engineData.outcomeWriteBackIndex,$__engineData.__outcomeWriteBackValue);
            $__engineData.outcomeWriteBackIndex=-1; // reset for next time
            $__engineData.__outcomeWriteBackValue=-1;
        }
        if($__engineData.cheatWriteBackIndex!==-1) {
            if($__engineData.cheatWriteBackIndex<0)
                throw new Error("Engine expects a non negative cheat write back value");
            $gameVariables.setValue($__engineData.cheatWriteBackIndex,$__engineData.__cheatWriteBackValue);
            $__engineData.cheatWriteBackIndex=-1;
            $__engineData.__cheatWriteBackValue=-1;
        }
    }

    terminate() {
        super.terminate()
        this.__cleanup();
        this.__writeBack();
    }


    __doSimTick() {
        var start = window.performance.now();

        this.__clearGraphics();
        IM.__doSimTick();
        this.__updateBackground();
        this.__prepareRenderToCameras();

        var time = window.performance.now()-start;
        if($__engineData.__debugLogFrameTime)
            console.log("Time taken for this frame: "+(time)+" ms")
    }

    addFilter(screenFilter, removeOnRoomChange = true, name = "ENGINE_DEFAULT_FILTER_NAME") {
        this.__filters.push({filter:screenFilter,remove:removeOnRoomChange,filterName: name});
        var filters = this.filters // PIXI requires reassignment
        filters.push(screenFilter);
        this.filters = filters;
    }

    removeFilter(filter) {
        var index = -1;
        for(var i = 0;i<this.__filters.length;i++) {
            if(filter===this.__filters[i].filter || filter === this.__filters[i].filterName) {
                index = i;
                break;
            }
        }
        if(index===-1) {
            console.error("Cannot find filter "+filter);
            return;
        }
        var filterObj = this.__filters[i]

        var filters = this.filters; // PIXI requirments.
        filters.splice(this.filters.indexOf(filterObj.filter),1);
        this.filters = filters;

        this.__filters.splice(index,1);
        
    }

    getTexture(name) {
        var tex = $__engineData.__textureCache[name];
        if(!tex) {
            var str = "Unable to find texture for name: "+String(name)+". Did you remember to include the texture in the manifest?"
            if($__engineData.__debugRequireTextures)
                throw new Error(str);
            console.error(str)
        }
        return tex;
    }

    /**
     * Returns a random texture from a spritesheet that was loaded using the spritesheet command
     * in textures_manifest
     * @param {String} name The name of the spritesheet
     */
    getRandomTextureFromSpritesheet(name) {
        var sheetData = $__engineData.__spritesheets[name];
        if(!sheetData) {
            var str = "Unable to find spritesheet for name: "+String(name)+". Was this texture initalized as a spritesheet?"
            if($__engineData.__debugRequireTextures)
                throw new Error(str);
            console.error(str)
            return undefined;
        }
        var idx = EngineUtils.irandomRange(0,sheetData-1);
        return this.getTexture(name+"_"+String(idx));
    }

    /**
     * Returns the number of textures stored in this spritesheet. For this function to work, 'name' must refer
     * to a texture loaded using the spritesheet command in textures_manifest
     * 
     * @param {String} name The name of the spritesheet
     */
    getSpriteSheetLength(name) {
        var sheetData = $__engineData.__spritesheets[name];
        if(!sheetData) {
            var str = "Unable to find texture for name: "+String(name)+". Did you remember to include the texture in the manifest?"
            if($__engineData.__debugRequireTextures)
                throw new Error(str);
            console.error(str)
            return -1;
        }
        return sheetData;
    }

    /**
     * Returns an array of textures from a spritesheet. For this function to work, you must
     * load the texture using the spritesheet command in textures_manifest.
     * @param {String} name The name of the spritesheet
     * @param {Number} startIdx The first index, inclusive
     * @param {Number} endIdx The last index, exclusive
     */
    getTexturesFromSpritesheet(name, startIdx, endIdx) {
        var textures = [];
        for(var i =startIdx;i<endIdx;i++) {
            textures.push(this.getTexture(name+"_"+String(i)));
        }
        return textures;
    }

    getGameTimer() {
        return this.__gameTimer;
    }

    getGlobalTimer() {
        return this.__globalTimer;
    }

    getWindowSizeX() {
        return Graphics.boxWidth
    }

    getWindowSizeY() {
        return Graphics.boxHeight
    }

    setCameraEnabled(index, enable) {
        this.__enabledCameras[index] = enable;
    }

    /**
     * Attaches a renderable to an isntance and automatically renders it every frame. When the instance is destroyed, the engine will
     * also destroy the renderable along with it.
     * 
     * The major difference between this and createRenderable is that createRenderable will also cause the engine to automatically render it, while
     * this function will only tell the engine to keep track of it for you.
     * @param {EngineInstance} parent The parent to attach the renderable to
     * @param {PIXI.DisplayObject} renderable The renderable to auto dispose of
     * @param {Boolean | false} align Whether or not to automatically move the renderable to match the parent instance's x, y, scale, and rotation
     */
    createRenderable(parent, renderable, align = false) {
        renderable.__depth = parent.depth
        renderable.__parent = parent;
        renderable.__align = align;
        renderable.dx=0;
        renderable.dy=0;
        if(renderable.texture && renderable.texture.defaultAnchor)
            renderable.anchor.set(renderable.texture.defaultAnchor.x,renderable.texture.defaultAnchor.y)
        parent.__renderables.push(renderable);
        return renderable;
    }

    /**
     * Attaches the lifetime of the specified renderable to the instance in question. When the instance is destroyed, the engine will
     * also destroy the renderable along with it.
     * 
     * The major difference between this and createRenderable is that createRenderable will also cause the engine to automatically render it, while
     * this function will only tell the engine to keep track of it for you.
     * @param {EngineInstance} parent The parent to attach the renderable to
     * @param {PIXI.DisplayObject} renderable The renderable to auto dispose of
     */
    createManagedRenderable(parent, renderable) {
        parent.__pixiDestructables.push(renderable);
    }

    
    /**
     * Frees the resources associated with the specified renderable. If you registered the renderble using createRenderable
     * or createManagedRenderable this will be called automicatcally by the engine when the parent instance is destroyed
     * 
     * Use this method only if you want to destroy a renderable that was not registered with the engine.
     * @param {PIXI.DisplayObject} renderable The renderable to destroy
     */
    freeRenderable(renderable) {
        renderable.destroy();
    }

    /**
     * Removes a renderable that was previsouly created with createRenderable() from it's parent and then destroys it.
     * @param {PIXI.DisplayObject} renderable The renderable to remove
     */
    removeRenderable(renderable) {
        renderable.__parent.__renderables.splice(renderable.__parent.__renderables.indexOf(renderable),1); // remove from parent
        renderable.__parent=null; // leave it to be cleaned up eventually
        this.freeRenderable(renderable)
    }

    /**
     * Requests that on this frame, the renderable be rendered to the GUI layer.
     * 
     * Renderables added to the GUI will render in the order they are added. As such, it recommended
     * to only call this in draw since it is sorted.
     * @param {PIXI.Container} renderable 
     */
    requestRenderOnGUI(renderable) {
        this.__GUIgraphics.addChild(renderable);
    }
    

    //TODO: leave as deprecated until it's done
    /**@deprecated */
    addGlobalObject(obj, name) { // TODO: global objects should run step and draw events...
        this.__globalObjects[name] = (obj);
    }

    /**@deprecated */
    getGlobalObject(name) {
        return this.__globalObjects[name];
    }

    /**@deprecated */
    removeGlobalObject(name) {
        delete this.__globalObjects[name]
    }

    getBackground() {
        return this.__background;
    }

    setBackground(background, autoDestroy) { // expects any PIXI renderable. renders first.
        if(autoDestroy) {
            for(const child of this.__backgroundContainer.children)
                this.freeRenderable(child);
        }
        this.__usingSolidColourBackground = false;
        this.__background = background;
        this.__backgroundContainer.removeChildren();
        this.__backgroundContainer.addChild(background)
        this.__autoDestroyBackground = autoDestroy;
    }
    
    setBackgroundColour(col) {
        if(!(this.__background instanceof PIXI.Graphics)) {
            throw new Error("Cannot set background colour of non graphics background. current type = " +  typeof(this.__background));
            //this.setBackgroud(new PIXI.Graphics());
        }
        this.__backgroundColour = col;
        this.__usingSolidColourBackground = true;
    }

    getBackgroundColour() {
        if(!this.__usingSolidColourBackground)
            throw new Error("Background is not a colour");
        return this.__backgroundColour;
    }

    __updateBackground() {
        if(!this.__usingSolidColourBackground)
            return;
        this.__background.clear();
        this.__background.beginFill(this.__backgroundColour);
        this.__background.drawRect(-128,-128,this.getWindowSizeX()+128,this.getWindowSizeY()+128)
        this.__background.endFill()
    }

    __prepareRenderToCameras() {
        for(var i =0;i<1;i++) { // this is probably ultra slow
            if(!this.__enabledCameras[i])
                continue;
            var camera = this.__cameras[i];
            camera.removeChildren();
            
            var arr = this.__collectAllRenderables();
            if(arr.length!==0) // prevent null call
                camera.addChild(...arr)
            camera.addChild(camera.getCameraGraphics());
        }
    }

    __collectAllRenderables() {
        var array = [];
        for(const inst of IM.__objectsSorted) {
            // https://stackoverflow.com/questions/1374126/how-to-extend-an-existing-javascript-array-with-another-array-without-creating
            array.push(...inst.__renderables);
        }
        return array;
    }

    __clearGraphics() {
        this.__GUIgraphics.clear();
        this.__GUIgraphics.removeChildren();

        this.getCamera().getCameraGraphics().clear();
        this.getCamera().getCameraGraphics().removeChildren();
    }

    __disposeHandles(instance) { //TODO: disposes of any resources associated with the object. This should remove any objects (renderables) associated with the instance.
        for(const renderable of instance.__renderables) {
            this.freeRenderable(renderable)
        }
        for(const renderable of instance.__pixiDestructables) {
            this.freeRenderable(renderable)
        }
    }
}

////////////////////////////////single time setup of engine///////////////////////

IN.__register();

__initalize = function() {
    var obj = {
        count : 0,
        scripts : 0,
        textures : 0,
        rooms : 0,
        instances : 0,
        elements : 0,
        time : window.performance.now(),
        total : 0,
        valid : false, // don't let the engine falsely think it's ready
        onNextLoaded : function() {
            this.count++;
            this.testComplete();
        },
        testComplete : function() {
            if(this.count===this.total && this.valid && this.elements===4) // all loaded
                this.onComplete();
        },
        onComplete : function() {
            __initalizeDone(this)
        },
        validate : function() {
            this.valid=true;
            if(this.count===this.total && this.elements===4) // already loaded everything, proceed. 4 = (scripts, rooms, textures, instances)
                this.onComplete();
        }
    }
    __prepareScripts("engine/scripts_manifest.txt",obj);
    __inst = __readInstances("engine/instances_manifest.txt",obj);
    __readTextures("engine/textures_manifest.txt",obj);
    __readRooms("engine/rooms_manifest.txt",obj);
    obj.validate()
}

__initalizeDone = function(obj) {
    IM.__init(this.__inst);
    RoomManager.__init();
    var msg = "("+String(obj.scripts)+(obj.scripts!==1 ? " scripts, " : " script, ")+String(obj.textures)+(obj.textures!==1 ? " textures, " : " texture, ") +
                String(obj.rooms)+(obj.rooms!==1 ? " rooms, " : " room, ")+String(obj.instances)+(obj.instances!==1 ? " instances) ->" : " instance) ->")
    console.log("Loaded all the files we need!",msg, window.performance.now() - obj.time," ms")
    $__engineData.__ready=true;
}

__prepareScripts = function(script_file,obj) {
    // code by Matt Ball, https://stackoverflow.com/users/139010/matt-ball
    // Source: https://stackoverflow.com/a/4634669
    const callback = function(fileData) {
        var data = EngineUtils.strToArrNewline(fileData);
        for (const x of data) {
            obj.total++;
            obj.scripts++;
            EngineUtils.attachScript(x,obj.onNextLoaded)
        }
        obj.elements++;
        obj.testComplete(); // update the obj
    }
    EngineUtils.readLocalFileAsync(script_file,callback);
}

__readRooms = function(room_file,obj) {
    const callback = function(fileData) {
        var data = EngineUtils.strToArrNewline(fileData);
        for(const x of data) {
            const arr = EngineUtils.strToArrWhitespace(x); // 0 = name, 1 = file
            const name = arr[0];
            obj.rooms++;
            obj.total++;
            const callback_room = function(text) {
                const roomData = EngineUtils.strToArrNewline(text);
                RoomManager.__addRoom(name, Room.__roomFromData(name,roomData));
                obj.onNextLoaded();
            }
            EngineUtils.readLocalFileAsync(arr[1],callback_room)
        }
        obj.elements++;
        obj.testComplete(); // update the obj
    }
    EngineUtils.readLocalFileAsync(room_file,callback);
}

__readInstances = function(instance_file,obj) {
    var inst = [];
    var callback = function(fileData) {
        const data = EngineUtils.strToArrNewline(fileData);
    
        for (const x of data) {
            const arr = EngineUtils.strToArrWhitespace(x);
            const scripts = arr.length-1;
            obj.total+=arr.length;
            obj.scripts++;
            obj.instances+=scripts;
            obj.onNextLoaded(); // count the script
            var c = function() {
                for(let i = 0;i<scripts;i++) {
                    inst.push(eval(arr[i]));
                    obj.onNextLoaded();
                }
            }
            EngineUtils.attachScript(arr[scripts],c);
        }

        obj.elements++;
        obj.testComplete(); // update the obj
    }
    EngineUtils.readLocalFileAsync(instance_file,callback);
    return inst;
}

__readTextures = function(texture_file,obj) { // already sync
    const callback = function(fileData) {
        var data = EngineUtils.strToArrNewline(fileData);
        var texData = [];
        // parse raw data into objects
        for (const d of data) {
            const arr = EngineUtils.strToArrWhitespace(d);

            const type = arr[0];
            let len = arr.length;
            let name = undefined;
            let path = undefined;
            let dx = undefined;
            let dy = undefined;
            if(type.toLowerCase()==="animate") {
                name = arr[len-1];
            } else {
                name = arr[len-4];
                path = arr[len-3]
                dx = parseFloat(arr[len-2])
                dy = parseFloat(arr[len-1])
                arr.length = arr.length - 4 // remove the last 4 elements from the array
            }

            var texObj = {
                texArgs: arr,
                texName: name,
                texPath: path,
                texOrigX: dx,
                texOrigY: dy
            }

            texData.push(texObj);
        }

        // parse the textObjs
        var required = [];
        var other = [];
        for(const texObj of texData) {
            __parseTextureObject(texObj)
            if(__queryTextureObject(texObj,"require"))
                required.push(texObj);
            else
                other.push(texObj);
        }
        for(const texObj of required) {
            __loadTexture(obj, texObj, () => {
                obj.onNextLoaded();
            });
        }
        for(const texObj of other) {
            __loadTexture(obj, texObj, () => {});
            obj.total--; // don't count the texture...
        }

        obj.elements++;
        obj.testComplete(); // update the obj
    }
    EngineUtils.readLocalFileAsync(texture_file,callback);
}

__setAnchor = function(tex, x,y) {
    if(x===-1)
        x = 0.5;
    if(y===-1)
        y=0.5;
    if(x>1)
        x = x/tex.width;
    if(y>1)
        y = y/tex.height;
    tex.defaultAnchor = new PIXI.Point(x,y);
}

__loadTexture = function(obj, texObj, update) {
    var spritesheet = __queryTextureObject(texObj,"spritesheet");
    var animate = __queryTextureObject(texObj,"animate");
    if(spritesheet) {
        obj.textures++;
        obj.total++;
        const tex = PIXI.Texture.from(texObj.texPath);
        tex.on('update',() => {
            __generateTexturesFromSheet(tex, texObj, spritesheet);
            update();
        });

    } else if(animate) {
        var frames = [];
        for(const tex of animate.textures) {
            var frameTexture = $__engineData.__textureCache[tex]
            if(!frameTexture)
                throw new Error("Texture "+tex+" cannot be found! make sure the texture is referenced before the animation")
            frames.push(frameTexture);
        }

        const anim = new PIXI.AnimatedSprite(frames); // loaded immediately.
        $__engineData.__textureCache[texObj.texName]=anim;

    } else {
        obj.textures++;
        obj.total++;
        const tex = PIXI.Texture.from(texObj.texPath);
        tex.on('update',() =>{
            __setAnchor(tex,texObj.texOrigX,texObj.texOrigY)
            update();
        });
        $__engineData.__textureCache[texObj.texName]=tex;
    }
    
}

__generateTexturesFromSheet = function(texture, texObj, spritesheet) { // replaces PIXI's internal spritesheet generator, which does more or less the same thing
    // note: texture is guaranteed to have been loaded when this is called.
    var cols = spritesheet.numColumns;
    var rows = spritesheet.numRows;
    var dx = spritesheet.xSize/spritesheet.numColumns; // normalized
    var dy = spritesheet.ySize/spritesheet.numRows;
    var baseName = texObj.texName + "_";
    var idx = 0;
    for(var y = 0;y<rows;y++) {
        for(var x = 0;x<cols;x++) {
            if(spritesheet.frameLimit[y] && x > spritesheet.frameLimit[y]) {
                break;
            }
            let rect = new PIXI.Rectangle(dx*x,dy*y,dx,dy);
            let tex = new PIXI.Texture(texture,rect);
            __setAnchor(tex,texObj.texOrigX,texObj.texOrigY)
            $__engineData.__textureCache[baseName+String(idx++)]=tex;
            
        }
    }
    $__engineData.__spritesheets[texObj.texName] = idx; // store the amount fo frames on a spritesheet
}

__parseTextureObject = function(texObj) {
    var argsParsed = [];
    var args = texObj.texArgs;
    for(var i = 0;i<args.length;i++) {
        var arg = args[i].toLowerCase();
        if(arg==="require") {
            argsParsed.push({key:"require",value:true});
        } else if(arg==="animate") {
            i=__parseAnimation(argsParsed, args, i);
        } else if(arg==="spritesheet") {
            i=__parseSpritesheet(argsParsed,args,i)
        }
    }
    texObj.texArgs = argsParsed;

}

__parseAnimation = function(argsParsed, args, i) {
    var texNames = [];
    i++;
    for(;i<args.length;i++) {
        texNames.push(args[i]);
    }
    argsParsed.push({
        key:"animate",
        value:{
            textures:texNames,
        }
    });
    return i;
}

__parseSpritesheet = function(argsParsed, args, i) {
    var dimensionX = -1;
    var dimensionY = -1;
    var columns = -1;
    var rows = -1;
    var limit = [];
    var animations = [];
    i++;
    for(;i<args.length;i++) {
        var arg = args[i].toLowerCase();
        if(arg==="dimensions") {
            dimensionX = parseInt(args[++i]);
            dimensionY = parseInt(args[++i]);
            columns = parseInt(args[++i]);
            rows = parseInt(args[++i]);
        } else if(arg==="limit") {
            if(rows===-1) throw new Error("Cannot limit before supplying dimensions");
            for(var k =0;k<rows;k++) {
                limit.push(parseInt(args[++i]));
            }
        } else if(arg==="animate") {
            var numAnimations = parseInt(args[++i]);
            for(var k =0;k<numAnimations;k++) {
                const animationName = args[++i];
                const animationLength = parseInt(args[++i]);
                const animationFrames = [];
                for(var j =0;j<animationLength;j++) {
                    animationFrames.push(parseInt(args[++i]));
                }
                animations.push({
                    animName: animationName,
                    animFrames: animationFrames,
                });
            }
        }
    }
    argsParsed.push( {
        key:"spritesheet",
        value: {
            xSize: dimensionX,
            ySize: dimensionY,
            numColumns: columns,
            numRows: rows,
            frameLimit: limit,
            anims: animations,
        }

    })
    return i;
}

__queryTextureObject = function(texObj, key) {
    for(var i =0;i<texObj.texArgs.length;i++) {
        if(texObj.texArgs[i].key===key)
            return texObj.texArgs[i].value;
    }
    return undefined;
}

////////////////// begin overriding RPG maker /////////////////
Scene_Boot.prototype.start = function() { // hijack the boot routine
    Scene_Base.prototype.start.call(this);
    SoundManager.preloadImportantSounds();
    if (DataManager.isBattleTest()) {
        DataManager.setupBattleTest();
        SceneManager.goto(Scene_Battle);
    } else if (DataManager.isEventTest()) {
        DataManager.setupEventTest();
        SceneManager.goto(Scene_Map);
    } else {
        this.checkPlayerLocation();
        DataManager.setupNewGame();
        SceneManager.goto(Scene_Engine);
        Window_TitleCommand.initCommandPosition();
    }
    this.updateDocumentTitle();
};

Scene_Boot.prototype.isReady = function() {
    if (Scene_Base.prototype.isReady.call(this)) {
        return DataManager.isDatabaseLoaded() && this.isGameFontLoaded() && $__engineData.__ready;
    } else {
        return false;
    }
};

// you get one.
DataManager.maxSavefiles = function() {
    return 1;
};


// take over menu
Scene_GameEnd.prototype.commandToTitle = function() {
    this.fadeOutAll();
    $__engineData.loadRoom = "MenuIntro";
    SceneManager.goto(Scene_Engine);
};

__initalize();