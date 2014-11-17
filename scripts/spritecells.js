"use strict";
(function(root) {

    root.addEventListener("load", load);

    var fileInput;
    var canvas;
    var context;
    var image;
    var inputState;

    var protocell;
    var cells = [];

    function load() {
        initCanvas();
        initHandlers();
        initToolbar();
        initImageLoader();

        // Save page state every N seconds
        //setInterval(savePageState, 10000);
    }

    function startLoop() {
        drawLoop();
        function drawLoop(dt) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            image.draw(context);
            cells.forEach(function(cell) {
                cell.draw(context);
            });
            if (protocell)
                protocell.draw(context, "rgba(120, 0, 0, 0.5)");
            // TODO: draw borders around the image

            mozRequestAnimationFrame(drawLoop);
        }
    }

    function initCanvas() {
        canvas = document.querySelector("canvas");
        if (!canvas)
            throw "no canvas found";
        canvas.width = root.screen.width*0.90;
        canvas.height = root.screen.height*0.90;
        context = canvas.getContext("2d");
    }

    function initImageLoader() {
        var fileInput = document.querySelector("#fileInput");
        fileInput.onchange = function() {
            loadImage(fileInput.files[0], function(img) {
                image = img;
                startLoop();
                loadPageState();
            });
        }
        fileInput.onchange();
    }

    function initHandlers() {
        inputState = new types.InputState(canvas);
        inputState.add("image", imageInputHandler())
        inputState.add("create-cell", cellCreateInputHandler())
    }

    function initToolbar() {
        var toolbar = document.querySelector("#toolbar");
        var btnImage = toolbar.querySelector("button.image");
        var btnCreateCell = toolbar.querySelector("button.create-cell");
        var btnModifyCell = toolbar.querySelector("button.modify-cell");

        btnImage.onclick = function(e) {
            inputState.set("image");
            savePageState();
        }
        btnCreateCell.onclick = function(e) {
            inputState.set("create-cell");
            savePageState();
        }
        btnModifyCell.onclick = function(e) {
            inputState.set("modify-cell");
            savePageState();
        }

        var activeButton;
        inputState.setHook(function(name) {
            if (activeButton)
                activeButton.classList.remove("active");
            var button = document.querySelector("#toolbar ."+name);
            if (button) {
                activeButton = button;
                activeButton.classList.add("active");
            }
        });
    }

    function loadImage(file, fn) {
        if (!file) {
            console.log("No file to load")
            return;
        }
        var url = window.URL.createObjectURL(file);
        var img = new Image();
        img.src = url;
        img.onload = function() {
            var image = new types.Image(img);
            if (fn)
                fn(image);
        }
    }

    var LSKEY = "spritecells";
    function loadPageState() {
        if (!localStorage) {
            console.log("cannot load page state, localStorage is not supported");
            return;
        }
        try {
            var s = localStorage[LSKEY];
            if (s == "")
                return;
            var state = JSON.parse(s);
            console.log("loaded page state", state);
            inputState.set(state.inputStateName);
            image.moveAt(state.image.x, state.image.y);
            image.scale = state.image.scale;
        } catch (e) {
            console.log(e);
            localStorage[LSKEY] = "";
        }
    }

    function savePageState() {
        if (!localStorage) {
            console.log("cannot save page state, localStorage is not supported");
            return;
        }
        var state = {
            inputStateName: inputState.activeName,
            image: select(image, ["x", "y", "scale"]),
        }
        console.log("saving page state", state);
        localStorage[LSKEY] = JSON.stringify(state);
    }

    function cellCreateInputHandler() {
        return bind({
            isMouseDown : false,
            mousedown : function(e) {
                var pos = eToCanvas(e);
                this.isMouseDown = true;
                protocell = new types.Cell("creating", {
                    top : pos.y,
                    left : pos.x,
                    right : pos.x,
                    bottom : pos.y,
                });
            },
            mouseup : function(e) {
                var pos = eToCanvas(e);
                this.isMouseDown = false;
                protocell.sortPoints();
                protocell.label = "cell-"+cells.length;
                cells.push(protocell);
                protocell = null;
            },
            mousemove : function(e) {
                if (!this.isMouseDown)
                    return;
                console.log("you sock");
                var pos = eToCanvas(e);
                protocell.right = pos.x;
                protocell.bottom = pos.y;
            },
        });
    }

    function imageInputHandler() {
        return bind({
            isMouseDown : false,
            mousemove : function(e) {
                if (!this.isMouseDown)
                    return;
                var pos = eToCanvas(e);
                image.moveAt(pos.x, pos.y);
                image.draw(context);
            },
            mousedown : function(e) {
                var pos = eToCanvas(e);
                image.moveAt(pos.x, pos.y);
                this.isMouseDown = true;
            },
            mouseup : function(e) {
                this.isMouseDown = false;
            },
            keydown: function(e) {
                console.log(e);
                if (e.keyCode == 61)
                    image.zoom(0.5);
                else if (e.keyCode == 173)
                    image.zoom(-0.5);
            },
        });
    }

    // utils --------------------------------

    function bind(obj) {
        for (var k in obj) {
            if (!obj.hasOwnProperty(k))
                continue;
            if (typeof obj[k] !== "function")
                continue;
            obj[k] = obj[k].bind(obj)
        }
        return obj;
    }

    function select(obj, keys) {
        var copy = {};
        keys.forEach(function(k) {
            copy[k] = obj[k];
        });
        return copy;
    }

    function windowToCanvas(x, y) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: (x - rect.left),
            y: (y - rect.top)
        }
    }

    function eToCanvas(e) {
        return windowToCanvas(e.clientX, e.clientY);
    }

    // each handlers may need to keep individual states
    //var inputHandler = {
    //    "image" : {
    //        "mousedown": function(e) { this.blah + 1 }
    //        "mousemove": function(e) { this.wah + 22 }
    //    }
    //    "cell-manipulate" : {},
    //    "cell-create" : {},
    //}
})(this);
