"use strict";
(function(root) {

    root.addEventListener("load", load);

    var fileInput;
    var canvas;
    var context;
    var inputState;

    var transformation;
    var image;
    var protocell;
    var selectedCell;
    var cells = [];

    var LSKEY = "spritecells";
    var MINCELL_SIZE = 15;

    function load() {
        transformation = new types.Transformation();

        initCanvas();
        initHandlers();
        initButtons();
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
        inputState.add("modify-cell", cellModifyInputHandler())
    }

    function initButtons() {
        var clearBtn = document.querySelector("#clear-btn");
        clearBtn.addEventListener("click", function() {
            if (cells.length > 0) {
                var yes = confirm("Clear all cells?");
                if (yes)
                    cells = [];
            }
        });
        var buttons = document.querySelectorAll("button");
        for (var i = 0; i < buttons.length; i++) {
            console.log(i, buttons[i]);
            buttons[i].addEventListener("click", savePageState);
        }
    }

    function initToolbar() {
        var toolbar = document.querySelector("#toolbar");
        var btnImage = toolbar.querySelector("button.image");
        var btnCreateCell = toolbar.querySelector("button.create-cell");
        var btnModifyCell = toolbar.querySelector("button.modify-cell");

        btnImage.addEventListener("click", function(e) {
            inputState.set("image");
        });
        btnCreateCell.addEventListener("click", function(e) {
            inputState.set("create-cell");
        });
        btnModifyCell.addEventListener("click", function(e) {
            inputState.set("modify-cell");
        });

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
            var image = new types.Image(img, {transformation: transformation});
            if (fn)
                fn(image);
        }
    }

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
            if (state.transformation) {
                matchValues(transformation, state.transformation);
            }
            if (state.cells) {
                state.cells.forEach(function(c) {
                    var cell = new types.Cell(c.label, {
                        top : c.top,
                        left : c.left,
                        right : c.right,
                        bottom : c.bottom,
                    })
                    cell.t = transformation;
                    cells.push(cell);
                });
            }
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
            transformation: transformation,
            cells: cells.map(function(cell) {
                return select(cell, ["label", "top", "left", "right", "bottom"]);
            }),
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
                var t = transformation;
                protocell = new types.Cell("creating", {
                    top : pos.y,
                    left : pos.x,
                    right : pos.x,
                    bottom : pos.y,
                }, transformation);
            },
            mouseup : function(e) {
                var pos = eToCanvas(e);
                this.isMouseDown = false;
                if (protocell.width() > MINCELL_SIZE &&
                    protocell.height() > MINCELL_SIZE) {
                    protocell.label = "cell-"+cells.length;
                    protocell.sortPoints();
                    cells.push(protocell);
                }
                protocell = null;
            },
            mousemove : function(e) {
                if (!this.isMouseDown)
                    return;
                var pos = eToCanvas(e);
                protocell.setRight(pos.x);
                protocell.setBottom(pos.y);
            },
            keydown: handleKeys,
        });
    }

    function cellModifyInputHandler() {
        return bind({
            isMouseDown : false,
            lastPos : null,
            mousedown : function(e) {
                if (selectedCell) {
                    selectedCell.style = null;
                }
                selectedCell = null;
                var pos = eToCanvas(e);
                this.isMouseDown = true;
                for (var i = 0; i < cells.length; i++) {
                    var cell = cells[i];
                    console.log(">", pos, cell.x(), cell.y());
                    if (cell.contains(pos.x, pos.y)) {
                        console.log("tadah", cell);
                        selectedCell = cell;
                        cell.style =  "rgba(0, 0, 120, 0.5)";
                        break;
                    }
                }
                this.lastPos = pos;
            },
            mouseup : function(e) {
                this.isMouseDown = false;
                this.lastPos = null;
            },
            mousemove : function(e) {
                if (!this.isMouseDown || !selectedCell)
                    return;
                var s = transformation.scale;
                var pos = eToCanvas(e);
                var dx = pos.x - this.lastPos.x;
                var dy = pos.y - this.lastPos.y;
                this.lastPos = pos;
                selectedCell.move(dx, dy);
            },
            keydown: combine(handleKeys, function(e) {
                if (e.keyCode == 46) {
                    if (!selectedCell)
                        return;
                    var i = cells.indexOf(selectedCell);
                    if (i > 0) {
                        cells.splice(i, 1);
                    }
                    selectedCell.style = null;
                    selectedCell = null;
                }
            }),
        });
    }

    function imageInputHandler() {
        return bind({
            isMouseDown : false,
            lastPos : null,
            mousemove : function(e) {
                if (!this.isMouseDown)
                    return;
                var pos = eToCanvas(e);
                var s = transformation.scale;
                var pos = eToCanvas(e);
                var dx = pos.x - this.lastPos.x;
                var dy = pos.y - this.lastPos.y;
                transformation.move(dx, dy);
                this.lastPos = pos;
            },
            mousedown : function(e) {
                var pos = eToCanvas(e);
                this.isMouseDown = true;
                this.lastPos = pos;
            },
            mouseup : function(e) {
                this.isMouseDown = false;
                this.lastPos = null;
            },
            keydown: handleKeys,
        });
    }

    function handleKeys(e) {
        console.log(e);
        if (e.keyCode == 61)
            transformation.zoom(0.2);
        else if (e.keyCode == 173)
            transformation.zoom(-0.2);
    }

    // utils --------------------------------

    function combine(f, g) {
        return function(x) {
            f(x);
            return g(x);
        }
    }

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

    function matchValues(dest, src) {
        for (var k in src) {
            if (!src.hasOwnProperty(k))
                continue;
            dest[k] = src[k];
        }
        return dest;
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
