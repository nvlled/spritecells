
function Cell(box) {
    this.top = Math.min(box.top, box.bottom);
    this.left = Math.min(box.left, box.right);
    this.right = Math.max(box.left, box.right);
    this.bottom = Math.max(box.top, box.bottom);
}

Cell.prototype = {
    width: function() {
        return this.right - this.left;
    },
    height: function() {
        return this.bottom - this.top;
    },
    draw: function(ctx, style) {
        ctx.fillStyle = style || "rgba(0, 120, 0, 0.5)";
        ctx.fillRect(this.left, this.top,
                this.width(), this.height());
        var index = _.indexOf(cells, this);
        ctx.font = "30px"
            ctx.strokeStyle = "#111";
        ctx.strokeText(index,
                this.left + this.width()/2,
                this.top + this.height()/2);
    },
    clone: function() {
        return new Cell(this);
    },
    copyRight: function() {
        var clone = this.clone();
        clone.move(this.width(), 0);
        return clone;
    },
    copyLeft: function() {
        var clone = this.clone();
        clone.move(-this.width(), 0);
        return clone;
    },
    copyUp: function() {
        var clone = this.clone();
        clone.move(0, -this.height());
        return clone;
    },
    copyDown: function() {
        var clone = this.clone();
        clone.move(0, this.height());
        return clone;
    },
    move: function(dx, dy) {
        this.top += dy;
        this.left += dx;
        this.right += dx;
        this.bottom += dy;
    },
    setPos: function(x, y) {
        var w = this.width(),
        h = this.height();
        this.left = x;
        this.top  = y;
        this.right = x + w;
        this.bottom = y + h;
    },
    contains: function(x, y) {
        return this.left <= x && x <= this.right &&
            this.top <= y  && y <= this.bottom ;
    },
    toString: function() {
        return this.left+","+this.top+","+this.right+","+this.bottom;
    }
}
