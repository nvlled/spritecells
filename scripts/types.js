(function(root) {

    function Cell(label, box) {
        this.label = label;
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
        draw: function(context, style) {
            context.fillStyle = style || "rgba(0, 120, 0, 0.5)";
            context.fillRect(this.left, this.top,
                         this.width(), this.height());
            context.font = "30px"
            context.strokeStyle = "#111";
            context.strokeText(this.label,
                        this.left,
                        this.top);
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
    }

    function Image(image, x, y) {
        this.data = image;
        this.x = x || 0;
        this.y = y || 0;
        this.scale = 1;
    }

    Image.prototype = {
        width : function() {
            var w = this.data.width * this.scale;
            return w <= 0 ? 0 : w;
        },
        height : function() {
            var h = this.data.height * this.scale;
            return h <= 0 ? 0 : h;
        },
        draw : function(context) {
            var image = this.data;
            context.drawImage(image, 0, 0,
                              image.width, image.height,
                              this.x, this.y,
                              this.width(), this.height());
        },
        zoom : function(d) {
            this.scale += d
            if (this.scale < 0)
                this.scale = 0;
        },
        move : function(dx, dy) { this.x += dx; this.y += dy },
        moveAt : function(x, y) { this.x = x  ; this.y = y },
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
        moveAt : function(x, y) { this.x = x  ; this.y = y },
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
