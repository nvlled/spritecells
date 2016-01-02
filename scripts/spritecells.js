"use strict";
(function(root) {

    root.addEventListener("load", load);

    var arrays = util.arrays;

    var fileInput;
    var canvas;
    var previewCanvas;
    var context;
    var inputState;
    var actionHistory;

    var selectedCell;
    var spritePreview;
    var transformation;
    var image;
    var cells = [];

    var LSKEY = "spritecells";
    var MINCELL_SIZE = 15;

    var enablePreview = true;

    var modect;
    function load() {
        actionHistory = new types.ActionHistory();
        root.hist = actionHistory;
        transformation = new types.Transformation();
        modect = new types.Modect();

        spritePreview = new SpritePreview(cells, {
            fps : 5,
        });

        initCanvas();
        initHandlers();
        initToolbar();
        initButtons();
        initImageLoader();
        loadPageState();

        var handler = modect.set.bind(modect);
        root.addEventListener("mousedown", handler);
        root.addEventListener("mouseup", handler);
        root.addEventListener("mousemove", handler);
        root.addEventListener("keydown", handler);
        root.addEventListener("keyup", handler);

        root.addEventListener("keydown", function(e) {
            console.log(e.key, " ", e.keyCode);
        });

        startLoop();

        // Save page state every N seconds
        //setInterval(savePageState, 10000);
    }

    var loopStarted = false;
    function startLoop() {
        if (loopStarted)
            return;

        var pcontext = previewCanvas.getContext("2d");
        drawLoop();
        function drawLoop(dt) {
            // Throttle loop as well
            if (modect.modified()) {
                clearCanvas(canvas);

                if (image)
                    image.draw(context);

                inputState.draw(context);
                cells.forEach(function(cell, i) {
                    cell.draw(context, null, i);
                });

            }

            clearCanvas(previewCanvas);
            if (enablePreview && image) {
                spritePreview.update();
                spritePreview.draw(pcontext, 0, 0);
            }

            modect.clear();
            requestAnimationFrame(drawLoop);
        }
    }

    function clearCanvas(canvas) {
        var context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
    }

    function initCanvas() {
        canvas = document.querySelector("canvas.main");
        if (!canvas)
            throw "no canvas found";
        canvas.width = root.screen.width*0.90;
        canvas.height = root.screen.height*0.50;
        context = canvas.getContext("2d");

        previewCanvas = document.querySelector("canvas.preview");
        previewCanvas.width = root.screen.width*0.90;
    }

    function initImageLoader() {
        var fileInput = document.querySelector("#fileInput");
        fileInput.onchange = function() {
            if (cells.length > 0 && confirm("Discard cells?")) {
                clearCells();
            }
            loadImage(fileInput.files[0], function(img) {
                image = img;
                transformation.x = 10;
                transformation.y = 10;
                modect.set();
            });
        }
        loadImage(fileInput.files[0], function(img) {
            image = img;
            modect.set();
        });
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
            var output = document.querySelector("#output");
            if (cells.length > 0) {
                var yes = confirm("Clear all cells?");
                if (yes) {
                    clearCells();
                    output.value = "";
                }
            } else {
                output.value = "";
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
        var btnZoomIn = toolbar.querySelector("button.zoom-in");
        var btnZoomOut = toolbar.querySelector("button.zoom-out");

        var genBtn = document.querySelector("#gen-btn");
        genBtn.onclick = generateJSON;

        btnZoomIn.onclick = function() { transformation.zoom(0.2) }
        btnZoomOut.onclick = function() { transformation.zoom(-0.2) }

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

        var fpsInput = document.querySelector("#preview-toolbar .fps");
        fpsInput.onkeyup = function() {
            console.log(this.value);
            var n = this.value;
            if (!Number.isNaN(n))
                spritePreview.setFPS(n);

        }
        fpsInput.onkeyup();

        var previewToggle = document.querySelector("#preview-toolbar .toggle");
        previewToggle.onchange = function() {
            enablePreview = previewToggle.checked;
        }
        enablePreview = previewToggle.checked;
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
                if (!this.cell)
                    return;
                if (this.cell.width() <= MINCELL_SIZE ||
                    this.cell.height() <= MINCELL_SIZE) {
                    this.cell = null;
                    return;
                }
                this.cell.label = "cell";
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
            lastPos : null,
            dx : 0,
            dy : 0,
            mousedown : function(e) {
                var pos = eToCanvas(e);
                var cell = getCellOnPoint(pos);
                if (cell) {
                    selectedCell = cell;
                    this.lastPos = pos;
                    this.origin = {
                        x : cell.x(),
                        y : cell.y(),
                    };
                }
            },
            mouseup : function(e) {
                var scell = selectedCell;
                if (!scell)
                    return;

                var s = transformation.scale;
                var dx = this.dx / s;
                var dy = this.dy / s;
                if (dx !== 0 || dy != 0)
                    actionHistory.done(action.ModifyCell(scell, dy, dx, dx, dy));
                this.lastPos = null;
            },
            mousemove : function(e) {
                var pos = eToCanvas(e);
                var scell = selectedCell;
                if (!scell)
                    return;
                if (this.lastPos) {
                    var dx = pos.x - this.lastPos.x;
                    var dy = pos.y - this.lastPos.y;
                    this.dx += dx;
                    this.dy += dy;
                    scell.move(dx, dy);
                } else {
                    this.dx = 0;
                    this.dy = 0;
                }
                this.lastPos = pos;
            },
        });
    }

    function cellResizeInputHandler() {
        return util.bind({
            lastPos : null,
            origin : null,
            mouseup : function(e) {
                this.lastPos = null;
                if (selectedCell) {
                    selectedCell.sortPoints();

                    var scell = selectedCell;
                    var c1 = this.origin;
                    var c2 = scell.refcell;
                    var dt = c2.top    - c1.top;
                    var dl = c2.left   - c1.left;
                    var dr = c2.right  - c1.right;
                    var db = c2.bottom - c1.bottom;
                    if (dt!=0 && dl!=0 && dr!=0 && db!=0)
                        actionHistory.done(action.ModifyCell(scell, dt, dl, dr, db));
                }
            },
            mousedown : function(e) {
                var pos = eToCanvas(e);
                var cell = getCellOnPoint(pos);
                if (cell) {
                    selectedCell = cell;
                }
            },
            mousemove : function(e) {
                var scell = selectedCell;
                if (!scell )
                    return;

                var pos = eToCanvas(e);
                if (this.lastPos) {
                    var dx = pos.x - this.lastPos.x;
                    var dy = pos.y - this.lastPos.y;
                    selectedCell.transform(0, 0, dx, dy);
                } else {
                    this.origin =
                        util.select(scell.refcell, ["top", "left", "right", "bottom"]);
                }
                this.lastPos = pos;
            },
        });
    }

    function cellRegionInputHandler() {
        return util.bind({
            region : null,
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
                    selectedCell = multicell;
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
            subHandler : null,
            resize : false,
            addCell : false,

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
                    if (selectedCell) {
                        selectedCell.restoreStyle();
                        selectedCell = null;
                    }
                    handler.mousedown(e);
                } else {
                    if (this.resize) // shift key down
                        handler = this.cellResize;
                    else
                        handler = this.cellMove;

                    var scell = selectedCell;
                    if (scell && scell.contains(cell)) {
                        scell.setReference(cell);
                    } else {
                        if (scell && this.addCell) {
                            scell.add(cell);
                        } else {
                            if (scell) scell.restoreStyle();
                            scell = new types.MultiCell(cell);
                        }
                    }
                    selectedCell = scell;
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
                    this.subHandler = null;
                }
            },
            keyup : function(e) {
                var scell = selectedCell;
                if (e.key === "r") {
                    this.resize = false;
                } else if (e.key === "Shift") {
                    this.addCell = false;
                } else if (e.shiftKey && scell) {
                    var cell;
                    if (e.key === "ArrowRight") {
                        var cell = scell.refcell.copyRight();
                    } else if (e.key === "ArrowLeft") {
                        var cell = scell.refcell.copyLeft();
                    } else if (e.key === "ArrowUp") {
                        var cell = scell.refcell.copyUp();
                    } else if (e.key === "ArrowDown") {
                        var cell = scell.refcell.copyDown();
                    }
                    if (cell) {
                        scell.restoreStyle();
                        selectedCell = new types.MultiCell(cell);
                        cells.push(cell);
                        actionHistory.done(action.CreateCell(cell));
                    }
                }
            },
            keydown : function(e) {
                this.resize = e.key === "r";
                this.addCell = e.key === "Shift";

                var scell = selectedCell;
                if (e.key === "y" && scell) {
                    scell.horizontalAlign();
                } else if (e.key === "x" && scell) {
                    scell.verticalAlign();
                } else if (e.key === "w" && scell) {
                    scell.syncWidth();
                } else if (e.key === "h" && scell) {
                    scell.syncHeight();
                } else if (e.key === "Delete" && scell) {
                    var preDelete = cells.slice(0);
                    scell.forEach(function(cell) {
                        arrays.remove(cells, cell);
                    });
                    var postDelete = cells.slice(0);

                    actionHistory.done(action.DeleteCells(preDelete, postDelete));
                    selectedCell = null;
                } else if (e.keyCode == 61) {
                    transformation.zoom(0.2);
                } else if (e.keyCode == 173) {
                    transformation.zoom(-0.2);
                }
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
        DeleteCells : function(preDelete, postDelete) {
            return {
                name : "delete-cell",
                undo : function() {
                    clearCells();
                    preDelete.forEach(function(cell) {
                        cells.push(cell);
                    });
                },
                redo : function() {
                    clearCells();
                    postDelete.forEach(function(cell) {
                        cells.push(cell);
                    });
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

    function generateJSON() {
        var output = document.querySelector("#output");
        var w = image.data.width;
        var h = image.data.height;
        var cells_ = cells.map(function(cell) {
            return {
                x : Math.max(truncate(cell.left), 0),
                y : Math.max(truncate(cell.top), 0),
                width : Math.min(truncate(cell.bottom - cell.top), w),
                height : Math.min(truncate(cell.right - cell.left), h),
            }
        });
        output.value = JSON.stringify(cells_);
        function truncate(n) { return +n.toFixed(2) }
    }

    function SpritePreview(cells, args) {
        args = args || {};
        this.setFPS(args.fps||30);
        this.cells = cells;
        this.index = 0;
        this.lastUpdate = +new Date();
    }

    SpritePreview.prototype = {
        setFPS : function(fps) {
            this.frame = 1 / (fps||0);
        },
        update : function() {
            var now = +new Date;
            var d = (now - this.lastUpdate)/1000;
            if (d >= this.frame) {
                var len = this.cells.length;
                this.index++;
                if (this.index >= this.cells.length)
                    this.index = 0;
                this.lastUpdate = now;
            }
        },
        draw : function(context, destX, destY) {
            var cell = this.cells[this.index];
            if (cell) {
                var w = Math.min(Math.abs(cell.right - cell.left), image.data.width);
                var h = Math.min(Math.abs(cell.bottom - cell.top), image.data.height);

                var x = Math.max(cell.left - image._x, 0);
                var y = Math.max(cell.top - image._y, 0);

                context.strokeRect(destX, destY, cell.width(), cell.height());;
                if (cell.width() >= 0 && cell.height() >= 0) {
                    context.drawImage(
                        image.data,
                        x, y,
                        w, h,
                        destX, destY, cell.width(), cell.height());
                }
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

    function clearCells() {
        cells.splice(0, cells.length);
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
