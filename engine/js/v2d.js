class V2D extends PIXI.Point {
    constructor(x,y) {
        this.setVector(x,y);
    }

    setVector(x,y) {
        this.x = x;
        this.y = y;
        this.__mag = V2D.calcMag(x,y)
        this.__dir = V2D.calcDir(x,y)
    }

    setX(x) {
        this.setVector(x,this.y);
    }

    setY(y) {
        this.setVector(this.x,y);
    }

    normalize() {
        var inv = 1/this.mag;
        this.x*=inv;
        this.y*=inv;
        this.mag=1;
    }

    dot(other) {
        return this.x*other.x+this.y*other.y
    }

    static dot(v1, v2) {
        return v1.x*v2.x+v1.y+v2.y;
    }
    
    add(...vertices) {
        var sx = x;
        var sy = y;
        vertices.forEach(v => {
            sx+=v.x;
            sy+=v.y;
        })
        this.setVector(sx,sy);
    }

    abs() {
        return new V2D(Math.abs(x),Math.abs(y));
    }

    mag() {
        return this.mag;
    }

    dir() {
        return this.dir
    }

    /**
     * Mirrors input across the line projected out by mirror
     * 
     * Note this method does not *reflect*, it mirrors it across the plane
     * 
     * @param {Number} input The input angle
     * @param {Number} mirror The mirror angle
     * @returns Input mirrored across mirror
     */
    static mirrorAngle(input, mirror) {
        var diff = V2D.angleDiff(input,mirror);
        var sign = Math.sign(diff);
        diff = Math.PI / 2 - Math.abs(diff);
        return input - diff * 2 * sign;
    }

    /**
     * Reflects input as if it struck a mirror. Convenience function.
     * 
     * @param {Number} input The input angle
     * @param {Number} mirror The mirror angle
     * @returns Input reflected by mirror
     */
    static reflectAngle(input, mirror) {
        return V2D.mirrorAngle(input,mirror+Math.PI/2)
    }

    static lengthDirX(angle, distance) {
		return Math.cos(angle)*distance;
	}
	
    static lengthDirY(angle, distance) {
		return -Math.sin(angle)*distance;
    }
    
    static distance(x1,y1,x2,y2) {
        var dx = x2-x1;
        var dy = y2-y1;
        return Math.sqrt(dx*dx+dy*dy);
    }

    static distanceSq(x1,y1,x2,y2) {
        var dx = x2-x1;
        var dy = y2-y1;
        return dx*dx+dy*dy;
    }

    static angleDiff(ang1, ang2) {
        // code written by bennedich https://stackoverflow.com/users/352837/bennedich
        // source: https://stackoverflow.com/a/7869457
        var diff = ang2 - ang1;
        return (((diff + Math.PI) % (Math.TWO_PI) + Math.TWO_PI) % Math.TWO_PI) - Math.PI;
    }

    static calcMag(x,y) {
        return Math.sqrt(x*x+y*y)
    }

    static calcDir(x,y) {
        return Math.atan2(y,x);
    }
}
Math.TWO_PI = Math.PI*2;