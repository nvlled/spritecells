"use strict";
(function(root) {

    root.addEventListener("load", load);

    var arrays = util.arrays;

    var fileInput;
    var canvas;
    var context;
    var inputState;
    var actionHistory;

    var transformation;
    var image;
    var protocell;
    var selectedCell;
    var cells = [];

    var LSKEY = "spritecells";
    var MINCELL_SIZE = 15;

    var modect;
    function load() {
        actionHistory = new types.ActionHistory();
        root.hist = actionHistory;
        transformation = new types.Transformation();
        modect = new types.Modect();

        initCanvas();
        initHandlers();
        initButtons();
        initToolbar();
        initImageLoader();

        var handler = modect.set.bind(modect);
        root.addEventListener("mousedown", handler);
        root.addEventListener("mouseup", handler);
        root.addEventListener("mousemove", handler);
        root.addEventListener("keydown", handler);
        root.addEventListener("keyup", handler);

        // Save page state every N seconds
        //setInterval(savePageState, 10000);
    }

    function startLoop() {
        drawLoop();
        function drawLoop(dt) {
            // Throttle loop as well
            if (modect.modified()) {
                context.clearRect(0, 0, canvas.width, canvas.height);
                image.draw(context);
                cells.forEach(function(cell) {
                    cell.draw(context);
                });
                if (protocell)
                    protocell.draw(context, "rgba(120, 0, 0, 0.5)");
                // TODO: draw borders around the image
            }
            modect.clear();
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
                loadPageState();
                startLoop();
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
            buttons[i].addEventListener("click", savePageState);
        }
    }

    function initToolbar() {
        var toolbar = document.querySelector("#toolbar");
        var btnImage = toolbar.querySelector("button.image");
        var btnCreateCell = toolbar.querySelector("button.create-cell");
        var btnModifyCell = toolbar.querySelector("button.modify-cell");
        var btnUndo = toolbar.querySelector("button.undo");
        var btnRedo = toolbar.querySelector("button.redo");

        btnImage.addEventListener("click", function(e) {
            inputState.set("image");
        });
        btnCreateCell.addEventListener("click", function(e) {
            inputState.set("create-cell");
        });
        btnModifyCell.addEventListener("click", function(e) {
            inputState.set("modify-cell");
        });

        btnUndo.onclick = function(e) {
            actionHistory.undo();
        };
        btnRedo.onclick = function(e) {
            actionHistory.redo();
        };

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
                util.matchValues(transformation, state.transformation);
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
                return util.select(cell, ["label", "top", "left", "right", "bottom"]);
            }),
        }
        console.log("saving page state", state);
        localStorage[LSKEY] = JSON.stringify(state);
    }

    function cellCreateInputHandler() {
        return util.bind({
            isMouseDown : false,
            enter : function() {
                canvas.style.cursor = "crosshair";
            },
            leave : function() {
                canvas.style.cursor = "";
            },
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
                if (protocell.width() <= MINCELL_SIZE ||
                    protocell.height() <= MINCELL_SIZE) {
                    protocell = null;
                    return;
                }
                protocell.label = "cell-"+cells.length;
                protocell.sortPoints();
                cells.push(protocell);
                actionHistory.done(action.CreateCell(protocell));

                protocell = null;
                // TODO: switch mode only if shift is not down
                inputState.set("modify-cell");
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

    // TODO: Separate resize and move handler
    function cellModifyInputHandler() {
        return util.bind({
            isMouseDown : false,
            lastPos : null,
            resize : false,
            cellData : null,
            mousedown : function(e) {
                if (selectedCell) {
                    selectedCell.style = null;
                }
                selectedCell = null;
                var pos = eToCanvas(e);
                this.isMouseDown = true;
                for (var i = 0; i < cells.length; i++) {
                    var cell = cells[i];
                    if (cell.contains(pos.x, pos.y)) {
                        selectedCell = cell;
                        cell.style =  "rgba(0, 0, 120, 0.5)";
                        break;
                    }
                }
                if (selectedCell && this.resize) {
                    selectedCell.setRight(pos.x);
                    selectedCell.setBottom(pos.y);
                }
                this.lastPos = pos;
                this.cellData = util.select(
                    selectedCell, ["top", "left", "right", "bottom"]);
            },
            mouseup : function(e) {
                this.isMouseDown = false;
                this.lastPos = null;
                if (!selectedCell)
                    return;

                selectedCell.sortPoints();

                var c1 = this.cellData;
                var c2 = selectedCell;
                var dt = c2.top    - c1.top;
                var dl = c2.left   - c1.left;
                var dr = c2.right  - c1.right;
                var db = c2.bottom - c1.bottom;
                actionHistory.done(action.ModifyCell(selectedCell, dt, dl, dr, db));

                this.lastSize = null;
                this.lastPos = null;
            },
            mousemove : function(e) {
                if (!this.isMouseDown || !selectedCell)
                    return;
                var pos = eToCanvas(e);
                if (this.resize) {
                    selectedCell.setRight(pos.x);
                    selectedCell.setBottom(pos.y);
                } else {
                    // **** var s = transformation.scale;
                    var dx = pos.x - this.lastPos.x;
                    var dy = pos.y - this.lastPos.y;
                    selectedCell.move(dx, dy);
                }
                this.lastPos = pos;
            },
            keyup: function(e) {
                if (e.keyCode == 16)
                    this.resize = false;
            },
            keydown: function(e) {
                if (e.keyCode == 61)
                    transformation.zoom(0.2);
                else if (e.keyCode == 173)
                    transformation.zoom(-0.2);
                if (e.keyCode == 46) {
                    if (!selectedCell)
                        return;

                    var i = cells.indexOf(selectedCell);
                    if (i >= 0) {
                        cells.splice(i, 1);
                    }
                    actionHistory.done(action.DeleteCell(i, selectedCell));

                    selectedCell.style = null;
                    selectedCell = null;
                }
                if (e.keyCode == 16)
                    this.resize = true;
            },
        });
    }

    function imageInputHandler() {
        return util.bind({
            isMouseDown : false,
            lastPos : null,
            enter : function() {
                canvas.style.cursor = "grab";
            },
            leave : function() {
                canvas.style.cursor = "";
            },
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
                canvas.style.cursor = "grabbing";
            },
            mouseup : function(e) {
                this.isMouseDown = false;
                this.lastPos = null;
                canvas.style.cursor = "grab";
            },
            keydown: handleKeys,
        });
    }

    var action = {
        CreateCell : function(cell) {
            return {
                name : "create-cell",
                undo : function() {
                    cells.pop();
                },
                redo : function() {
                    cells.push(cell);
                },
            }
        },
        DeleteCell : function(index, cell) {
            return {
                name : "delete-cell",
                undo : function() {
                    arrays.insertAt(cells, index, cell);
                },
                redo : function() {
                    arrays.remove(cells, cell);
                },
            }
        },
        ModifyCell : function(cell, dt, dl, dr, db) {
            return {
                name : "modify-cell",
                undo : function() {
                    var s = transformation.scale;
                    cell.transform(-dt*s, -dl*s, -dr*s, -db*s);
                },
                redo : function() {
                    var s = transformation.scale;
                    cell.transform(dt*s, dl*s, dr*s, db*s);
                },
            }
        },
    }

    function handleKeys(e) {
        console.log(e);
        if (e.keyCode == 61)
            transformation.zoom(0.2);
        else if (e.keyCode == 173)
            transformation.zoom(-0.2);
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
