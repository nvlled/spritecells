(function(root) {

    function Cell(label, box, transformation) {
        this.label = label;
        this.top = Math.min(box.top, box.bottom);
        this.left = Math.min(box.left, box.right);
        this.right = Math.max(box.left, box.right);
        this.bottom = Math.max(box.top, box.bottom);
        this.setTransformation(transformation);
    }

    Cell.prototype = {
        x: function() {
            return this.t.scale*(this.left + this.t.x);
        },
        y: function() {
            return this.t.scale*(this.top + this.t.y);
        },
        setRight: function(x) {
            var t = this.t;
            var s = t.scale;
            this.right = x/s - t.x;
        },
        setBottom: function(y) {
            var t = this.t;
            var s = t.scale;
            this.bottom = y/s - t.y;
        },
        width: function() {
            return this.t.scale * (this.right - this.left);
        },
        height: function() {
            return this.t.scale * (this.bottom - this.top);
        },
        draw: function(context, style) {
            context.fillStyle = style || this.style || "rgba(0, 120, 0, 0.5)";
            context.fillRect(this.x(), this.y(),
                         this.width(), this.height());
            context.font = "30px"
            context.strokeStyle = "#111";
            context.strokeText(this.label,
                        this.x(),
                        this.y());
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
            var s = this.t.scale;
            this.top += dy/s;
            this.left += dx/s;
            this.right += dx/s;
            this.bottom += dy/s;
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
            var right = this.x() + this.width();
            var bottom = this.y() + this.height();
            return this.x() <= x && x <= right &&
                this.y() <= y  && y <= bottom;
        },
        toString: function() {
            return this.left+","+this.top+","+this.right+","+this.bottom;
        },
        sortPoints : function() {
            var top = this.top;
            var left = this.left;
            var right = this.right;
            var bottom = this.bottom;
            this.top = Math.min(top, bottom);
            this.left = Math.min(left, right);
            this.right = Math.max(left, right);
            this.bottom = Math.max(top, bottom);
        },
        setTransformation : function(transformation) {
            var t = this.t = transformation || new Transformation();
            var s = t.scale;
            this.top = this.top/s-t.y;
            this.left = this.left/s-t.x;
            this.right = this.right/s-t.x;
            this.bottom = this.bottom/s-t.y;
        },
    }

    function Image(image, args) {
        this.data = image;
        this._x = args.x || 0;
        this._y = args.y || 0;
        this.t = args.transformation || new Transformation();
    }

    Image.prototype = {
        x: function() {
            return this.t.scale*(this._x + this.t.x);
        },
        y: function() {
            return this.t.scale*(this._y + this.t.y);
        },
        width : function() {
            var w = this.data.width * this.t.scale;
            return w <= 0 ? 0 : w;
        },
        height : function() {
            var h = this.data.height * this.t.scale;
            return h <= 0 ? 0 : h;
        },
        draw : function(context) {
            var image = this.data;
            context.drawImage(image, 0, 0,
                              image.width, image.height,
                              this.x(), this.y(),
                              this.width(), this.height());
        },
        move : function(dx, dy) { this._x += dx; this._y += dy },
        moveAt : function(x, y) { this._x = x  ; this._y = y },
    }

    function InputState(node) {
        this.activeName = "";
        this.activeHandler = null;
        this.handlers = {};
        this.hook = function() {};
        this.node = node;
    }

    InputState.prototype = {
        add : function(name, handler) {
            this.handlers[name] = handler;
        },
        set : function(name) {
            this.clear()

            var handler = this.handlers[name];
            if (handler) {
                var node = this.node;
                node.addEventListener("mousedown", handler.mousedown);
                node.addEventListener("mouseup", handler.mouseup);
                node.addEventListener("mousemove", handler.mousemove);
                root.addEventListener("keydown", handler.keydown);
            } else {
                console.log("handler not registered:", name);
            }
            this.activeName = name;
            this.activeHandler = handler;
            if (typeof this.hook === "function")
                this.hook(name);
        },
        clear : function() {
            var handler = this.activeHandler;
            if (!handler)
                return;
            var node = this.node;
            node.removeEventListener("mousedown", handler.mousedown);
            node.removeEventListener("mouseup", handler.mouseup);
            node.removeEventListener("mousemove", handler.mousemove);
            root.removeEventListener("keydown", handler.keydown);
        },
        setHook : function(fn) {
            this.hook = fn;
        },
    }

    function Transformation() {
        this.x = 0;
        this.y = 0;
        this.scale = 1;
    }

    Transformation.prototype = {
        moveAt : function(x, y) {
            var s = this.scale;
            this.x = x/s;
            this.y = y/s;
        },
        zoom : function(d) {
            this.scale += d
            if (this.scale < 0)
                this.scale = 0;
        },
    }

    root.types = {
        Cell : Cell,
        Image : Image,
        InputState : InputState,
        Transformation : Transformation,
    }
})(this);
