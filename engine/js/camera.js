class Camera extends PIXI.Container {

    constructor(x,y,w,h,r) { // these are the IN GAME camera variables.
        super();
        this.CANVAS_WIDTH = Graphics.boxWidth;
        this.CANVAS_HEIGHT = Graphics.boxHeight;
        this.engineX = this.x;
        this.engineY = this.y;
        this.angle = 0;
        this.filters = [];
        this.__autoDestroyBackground = true;
        this.__background=undefined;
        this.__backgroundColour=0;
        this.__filters = [];
        this.__cameraBackgroundGraphics = new PIXI.Graphics();
        this.__cameraBackground = new PIXI.Container();
        this.__cameraRenderContainer = new PIXI.Container();
        this.__cameraGraphics = new PIXI.Graphics(); // shared graphics, always draws on top of everything.
        this.__renderContainer = new PIXI.Container();
        this.__cameraGUI = new PIXI.Container(); // bit of a dumb fix for GUI elements that should blur with the minigame.

        this.__cameraRenderContainer.addChild(this.__renderContainer);
        this.__cameraRenderContainer.addChild(this.__cameraGraphics);

        this.addChild(this.__cameraBackgroundGraphics); // colour
        this.addChild(this.__cameraBackground);
        this.addChild(this.__cameraRenderContainer)
        this.addChild(this.__cameraGUI)

        this.setLocation(x,y);
        this.setDimensions(w,h);
        this.setRotation(r);
        
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

    /**
     * Sets a renderable to be rendered in the background.
     * @param {PIXI.DisplayObject} background The background to use
     * @param {Boolean | true} autoDestroy Whether or not to auto destroy this background when the game ends or a new background is set.
     */
     setBackground(background, autoDestroy=true) { // expects any PIXI renderable. renders first.
        if(this.__autoDestroyBackground) {
            for(const child of this.__cameraBackground.children)
                $engine.freeRenderable(child);
        }
        this.__background = background;
        this.__cameraBackground.removeChildren();
        if(background) // remove
            this.__cameraBackground.addChild(background)
        this.__autoDestroyBackground = autoDestroy;
    }

    getBackground() {
        return this.__background;
    }

    getBackgroundColour() {
        return this.__backgroundColour
    }

    /**
     * Sets the background colour of the camera. Removes the current background if applicable.
     * @param {Number} colour The new background colour
     */
    setBackgroundColour(colour) {
        this.__backgroundColour = colour;
        this.__cameraBackgroundGraphics.beginFill(colour);
        this.__cameraBackgroundGraphics.drawRect(-128,-128,$engine.getWindowSizeX()+256,$engine.getWindowSizeY()+256);
        this.__cameraBackgroundGraphics.endFill();
        this.setBackground(undefined);
    }

    getCameraGraphics() {
        return this.__cameraGraphics;
    }

    __getRenderContainer() {
        return this.__renderContainer;
    }

    __getCameraRenderContainer() {
        return this.__cameraRenderContainer;
    }

    /**
     * Sets the main container of this Camera. Useful for special rendering like PIXI.projection.Container2d.
     * @param {PIXI.DisplayObject} renderable The new container
     */
    setRenderContainer(renderable) {
        this.__renderContainer = renderable;
    }

    reset() {
        this.setLocation(0,0);
        this.setRotation(0);
        this.setScale(1,1);
    }

    setLocation(x,y) { // x and y are negative so that they represent where the camera would physically be.
        IN.__validMouse = false;
        this.engineX = x; // we use intermediates so that we can have our own coord. system.
        this.engineY = y;
        this.__applyLocation();
    }

    __applyLocation() {
        var dx = this.getWidth()/2;
        var dy = this.getHeight()/2;

        var off = new Vertex(dx,dy);
        off.rotate(this.angle);
        off.translate(-dx,-dy)

        this.__cameraRenderContainer.rotation = this.angle;
        this.__cameraRenderContainer.x = (-this.engineX - off.x) * this.__cameraRenderContainer.scale.x;
        this.__cameraRenderContainer.y = (-this.engineY - off.y) * this.__cameraRenderContainer.scale.y;
    }

    __getCenter() {
        return new EngineLightweightPoint(this.engineX + this.getWidth()/2,this.engineY + this.getHeight()/2);
    }

    translate(dx,dy) {
        this.setLocation(this.getX()+dx, this.getY()+dy);
    }

    setX(x) {
        this.setLocation(x,this.getY())
    }

    setY(y) {
        this.setLocation(this.getX(),y)
    }

    getX() {
        return this.engineX;
    }

    getY() {
        return this.engineY;
    }

    setScaleX(sx) {
        IN.__validMouse = false;
        this.__cameraRenderContainer.scale.x = sx;
    }

    getScaleX() {
        return this.__cameraRenderContainer.scale.x;
    }

    setScaleY(sy) {
        IN.__validMouse = false;
        this.__cameraRenderContainer.scale.y = sy;
    }

    getScaleY() {
        return this.__cameraRenderContainer.scale.y;
    }

    setScale(sx, sy) {
        IN.__validMouse = false;
        this.__cameraRenderContainer.scale.x = sx;
        this.__cameraRenderContainer.scale.y = sy;
    }

    setDimensions(w,h) {
        var sx = this.CANVAS_WIDTH/w;
        var sy = this.CANVAS_HEIGHT/h;
        this.setScale(sx,sy);
    }

    setWidth(w) {
        var sx = this.CANVAS_WIDTH/w;
        this.setScaleX(sx)
    }

    setHeight(h) {
        var sy = this.CANVAS_HEIGHT/h;
        this.setScaleY(sy)
    }

    getWidth() {
        return this.getScaleX() * this.CANVAS_WIDTH;
    }

    getHeight() {
        return this.getScaleY() * this.CANVAS_HEIGHT;
    }

    setRotation(rot) {
        IN.__validMouse = false;
        this.angle = rot;
        this.__applyLocation();
    }

    getRotation() {
        return this.angle;
    }

    __match() {
        var len = this.__renderContainer.children.length;
        if(!$engine.isTimeScaled()) {
            for(var i =0;i<len;i++) {
                var child = this.__renderContainer.children[i];
                if(!child.__align)
                    continue;
                var parent = child.__parent;
                child.x = parent.x;
                child.y = parent.y;
                child.x+=child.dx;
                child.y+=child.dy;
                child.rotation = parent.angle;
                child.scale.x = parent.xScale;
                child.scale.y = parent.yScale;
                child.alpha = parent.alpha
            }
        } else {
            var fraction = $engine.getTimescaleFraction();
            for(var i =0;i<len;i++) {
                var child = this.__renderContainer.children[i];
                if(!child.__align)
                    continue;
                var parent = child.__parent;
                child.x = parent.__lx + (parent.x-parent.__lx)*fraction;
                child.y = parent.__ly + (parent.y-parent.__ly)*fraction;
                child.x+=child.dx;
                child.y+=child.dy;
                child.rotation = parent.__langle + (parent.angle-parent.__langle)*fraction;
                child.scale.x = parent.__lxScale + (parent.xScale-parent.__lxScale)*fraction;
                child.scale.y = parent.__lyScale + (parent.yScale-parent.__lyScale)*fraction;
                child.alpha = parent.__lalpha + (parent.alpha-parent.__lalpha)*fraction
            }
        }
    }

    __reportMouse(point,global) {
        return Graphics._renderer.plugins.interaction.mouse.getLocalPosition(this.__cameraRenderContainer,point,global);
    }


    updateTransform() {
        this.__match();
        super.updateTransform();
    }
}