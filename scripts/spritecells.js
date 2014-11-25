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
                inputState.draw(context);
                cells.forEach(function(cell) {
                    cell.draw(context);
                });
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
            cell : null,
            isMouseDown : false,
            enter : function() {
                canvas.style.cursor = "crosshair";
            },
            leave : function() {
                canvas.style.cursor = "";
            },
            draw : function(e) {
                if (this.cell)
                    this.cell.draw(context, "rgba(120, 0, 0, 0.5)");
            },
            mousedown : function(e) {
                var pos = eToCanvas(e);
                this.isMouseDown = true;
                var t = transformation;
                this.cell = new types.Cell("creating", {
                    top : pos.y,
                    left : pos.x,
                    right : pos.x,
                    bottom : pos.y,
                }, transformation);
            },
            mouseup : function(e) {
                var pos = eToCanvas(e);
                this.isMouseDown = false;
                if (this.cell.width() <= MINCELL_SIZE ||
                    this.cell.height() <= MINCELL_SIZE) {
                    this.cell = null;
                    return;
                }
                this.cell.label = "cell-"+cells.length;
                this.cell.sortPoints();
                cells.push(this.cell);
                actionHistory.done(action.CreateCell(this.cell));

                this.cell = null;
                // TODO: switch mode only if shift is not down
                inputState.set("modify-cell");
            },
            mousemove : function(e) {
                if (!this.isMouseDown)
                    return;
                var pos = eToCanvas(e);
                this.cell.setRight(pos.x);
                this.cell.setBottom(pos.y);
            },
            keydown: handleKeys,
        });
    }

    function cellMoveInputHandler() {
        return util.bind({
            selectedCell : null,
            lastPos : null,
            mousedown : function(e) {
                var pos = eToCanvas(e);
                var cell = getCellOnPoint(pos);
                if (cell) {
                    this.selectedCell = cell;
                    this.lastPos = pos;
                }
            },
            mouseup : function(e) {
                this.lastPos = null;
            },
            mousemove : function(e) {
                var pos = eToCanvas(e);
                var scell = this.selectedCell;
                if (!scell)
                    return;
                if (this.lastPos) {
                    var dx = pos.x - this.lastPos.x;
                    var dy = pos.y - this.lastPos.y;
                    scell.move(dx, dy);
                }
                this.lastPos = pos;
            },
        });
    }

    function cellResizeInputHandler() {
        return util.bind({
            selectedCell : null,
            lastPos : null,
            mouseup : function(e) {
                this.lastPos = null;
                if (this.selectedCell) {
                    this.selectedCell.sortPoints();
                }
            },
            mousedown : function(e) {
                var pos = eToCanvas(e);
                var cell = getCellOnPoint(pos);
                if (cell) {
                    this.selectedCell = cell;
                }
            },
            mousemove : function(e) {
                var scell = this.selectedCell;
                if (!scell )
                    return;

                var pos = eToCanvas(e);
                if (this.lastPos) {
                    var dx = pos.x - this.lastPos.x;
                    var dy = pos.y - this.lastPos.y;
                    var s = transformation.scale;
                    this.selectedCell.transform(0, 0, dx, dy);
                }
                this.lastPos = pos;
            },
        });
    }

    function cellRegionInputHandler() {
        return util.bind({
            region : null,
            selectedCell : null,
            draw : function(context) {
                if (this.region) {
                    var r = this.region;
                    context.strokeRect(r.x, r.y, r.w, r.h);
                }
            },
            newRegion : function(e) {
                var pos = eToCanvas(e);
            },
            mousedown : function(e) {
                var pos = eToCanvas(e);
                this.region = {
                    x : pos.x,
                    y : pos.y,
                    w : 0,
                    h : 0,
                }
                this.lastPos = pos;
            },
            getEnclosedCells : function() {
                var enclosed = [];
                cells.forEach(function(cell) {
                    if (this.contains(cell)) {
                        enclosed.push(cell);
                    }
                }.bind(this));
                return enclosed;
            },
            contains : function(cell) {
                var r = this.region;
                var w = cell.width();
                var h = cell.height();
                return r.x <= cell.x() &&
                    r.y <= cell.y() &&
                    r.x+r.w >= cell.x()+w &&
                    r.y+r.h >= cell.y()+h;
            },
            mouseup : function(e) {
                var r = this.region;
                if (r.w < 0) {
                    r.x += r.w;
                    r.w = Math.abs(r.w);
                }
                if (r.h < 0) {
                    r.y += r.h;
                    r.h = Math.abs(r.h);
                }
                var cells = this.getEnclosedCells();
                if (cells.length > 0) {
                    var multicell = types.MultiCell.create(cells);
                    this.selectedCell = multicell;
                }
            },
            mousemove : function(e) {
                var pos = eToCanvas(e);
                if (this.lastPos) {
                    var dx = pos.x - this.lastPos.x;
                    var dy = pos.y - this.lastPos.y;
                    this.region.w += dx;
                    this.region.h += dy;
                    var r = this.region;
                }
                this.lastPos = pos;
            },
        });
    }

    function cellModifyInputHandler() {
        var identity = function() {};
        return util.bind({
            selectedCell : null,
            subHandler : null,
            resize : false,

            cellResize : cellResizeInputHandler(),
            cellMove : cellMoveInputHandler(),
            cellRegion : cellRegionInputHandler(),

            draw : function(context) {
                if (!this.subHandler)
                    return;
                var draw = this.subHandler.draw;
                if (typeof draw=== "function")
                    draw(context);
            },
            mousedown : function(e) {
                var pos = eToCanvas(e);
                var cell = getCellOnPoint(pos);
                var handler;
                if (!cell) {
                    handler  = this.cellRegion;
                    if (handler.selectedCell) {
                        handler.selectedCell.restoreStyle();
                        handler.selectedCell = null;
                    }
                    handler.mousedown(e);
                } else {
                    if (this.resize) // shift key down
                        handler = this.cellResize;
                    else
                        handler = this.cellMove;

                    var scell = this.selectedCell;
                    if (scell && scell.contains(cell)) {
                        scell.setReference(cell);
                    } else {
                        if (scell) scell.restoreStyle();
                        scell = new types.MultiCell(cell);
                    }
                    this.setSelectedCell(scell);
                }
                this.subHandler = handler;
            },
            mousemove : function(e) {
                if (this.subHandler)
                    this.subHandler.mousemove(e);
            },
            mouseup : function(e) {
                var h = this.subHandler;
                if (h) {
                    h.mouseup(e);
                    this.selectedCell = h.selectedCell;
                    this.subHandler = null;
                }
            },
            keyup : function(e) {
                if (e.keyCode === 16)
                    this.resize = false;
            },
            keydown : function(e) {
                this.resize = e.keyCode === 16;
                var scell = this.selectedCell;
                if (e.key === "y" && scell) {
                    scell.horizontalAlign();
                } else if (e.key === "x" && scell) {
                    scell.verticalAlign();
                } else if (e.key === "w" && scell) {
                    scell.syncWidth();
                } else if (e.key === "h" && scell) {
                    scell.syncHeight();
                } else if (e.key === "Del" && scell) {
                    scell.forEach(function(cell) {
                        arrays.remove(cells, cell);
                    });
                    this.setSelectedCell(null);
                } else if (e.keyCode == 61) {
                    transformation.zoom(0.2);
                } else if (e.keyCode == 173) {
                    transformation.zoom(-0.2);
                }
            },
            setSelectedCell : function(cell) {
                this.selectedCell = cell;
                this.cellResize.selectedCell = cell;
                this.cellMove.selectedCell = cell;
                this.cellRegion.selectedCell = cell;
            }
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

    function getCellOnPoint(pos) {
        for (var i = 0; i < cells.length; i++) {
            var cell = cells[i];
            if (cell.contains(pos.x, pos.y)) {
                return cell;
            }
        }
        return null;
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
