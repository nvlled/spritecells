
(function(root) {
    var canvas,
        ctx,
        loadBtn,
        genBtn,
        coord,
        select = {
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
        },
        mousePos = null;
        selectedCell = null;
        cells = [],
        resizing = false,
        dragging = false,
        imageLoaded = false,
        image = new Image();

    function handleButtons() {
        loadBtn.onchange = loadImage;
        genBtn.onclick = generateCellData;
        clearBtn.onclick = reset;
    }

    function generateCellData() {
        console.log("generating cell data");
        var rects = _.map(cells, function(cell) {
            var topLeft = canvasToImg(cell.left, cell.top),
                bottomRight = canvasToImg(cell.right, cell.bottom);
            return {
                top: topLeft.y,
                left: topLeft.x,
                right: bottomRight.x,
                bottom: bottomRight.y,
                width: bottomRight.x - topLeft.x,
                height: bottomRight.y - topLeft.y
            }
        });
        output.value = JSON.stringify(rects);
    }

    function loadImage() {
        if(loadBtn.files.length == 0) {
            return
        }
        var file = loadBtn.files[0],
            url = window.URL.createObjectURL(file);

        imageLoaded = false;
        image.src = url;
        image.onload = function() {
            console.log("image loaded");
            var ratio = image.height / image.width;
            canvas.height = canvas.width * ratio;
            ctx.drawImage(image, 0, 0,
                    image.width, image.height,
                    0, 0,
                    canvas.width, canvas.height);

            imageLoaded = true;
            reset();
        }
    }

    function reset() {
        selectedCell = null;
        output.value = "";
        cells = [];
    }

    function handleKeys() {
        document.onkeypress = function(e) {
            console.log(e);
            if(e.charCode == 76) {
                if(selectedCell) {
                    selectedCell =  selectedCell.copyRight();
                    cells.push(selectedCell);
                }
            } else if(e.charCode == 74) {
                if(selectedCell) {
                    selectedCell =  selectedCell.copyDown();
                    cells.push(selectedCell);
                }
            } else if(e.charCode == 72) {
                if(selectedCell) {
                    selectedCell =  selectedCell.copyLeft();
                    cells.push(selectedCell);
                }
            } else if(e.charCode == 75) {
                if(selectedCell) {
                    selectedCell =  selectedCell.copyUp();
                    cells.push(selectedCell);
                }
            } else if(e.charCode == 122) {
                var cell = cells.pop();
                if(cells) {
                    selectedCell = _.last(cells);
                }
            } else if(e.keyCode == 46) {
                cells = _.reject(cells, function(cell) {
                    return cell == selectedCell;
                });
                selectedCell = null;
            }
        }
    }

    function monitorMouse() {
        canvas.addEventListener("mousemove", function(e) {
            var pos = windowToCanvas(e.clientX, e.clientY);
            coord.textContent = "x: "+pos.x+", y: "+pos.y;
        });

        canvas.addEventListener("mousedown", function(e) {
            var pos = mousePos = windowToCanvas(e.clientX, e.clientY);
            var cell = _.find(cells, function(cell) {
                return cell.contains(pos.x, pos.y);
            });

            resizing = e.shiftKey;
            if(selectedCell && selectedCell.contains(pos.x, pos.y)) {
                cell = selectedCell;
            } else if(cell == null) {
                cell = new Cell({
                    top: pos.y,
                    left: pos.x,
                    right: pos.x,
                    bottom: pos.y
                });
                resizing = true;
            }
            dragging = !resizing;
            selectedCell = cell;
        });

        canvas.addEventListener("mousemove", function(e) {
            var pos = windowToCanvas(e.clientX, e.clientY);

            if(dragging) {
                var dx = pos.x - mousePos.x,
                    dy = pos.y - mousePos.y;
                selectedCell.move(dx, dy);
                mousePos = pos;
            } else if (resizing) {
                selectedCell.right = pos.x;
                selectedCell.bottom = pos.y;
            }
        });

        canvas.addEventListener("mouseup", function(e) {
            if(resizing) {
                if(! _.contains(cells, selectedCell) &&
                    selectedCell.width() > 10 && selectedCell.height() > 10) {
                    cells.push(selectedCell);
                } else {
                    selectedCell = null;
                }
            }
            resizing = false;
            dragging = false;
        });
    }


    function windowToCanvas(x, y) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: (x - rect.left),
            y: (y - rect.top)
        }
    }

    function canvasToImg(x, y) {
        return {
            x: x * image.width/canvas.width,
            y: y * image.height/canvas.height
        }
    }

    function loop() {
        if(imageLoaded) {
            ctx.drawImage(image, 0, 0,
                    image.width, image.height,
                    0, 0,
                    canvas.width, canvas.height);
        }
        cells.forEach(function(cell) {
            cell.draw(ctx);
        });

        if(selectedCell) {
            selectedCell.draw(ctx, "rgba(128, 0, 0, 0.5)");
        }
        mozRequestAnimationFrame(loop);
    }

    function getDOM() {
        canvas = document.getElementById("canvas");
        loadBtn = document.getElementById("loadBtn");
        genBtn = document.getElementById("genBtn");
        clearBtn = document.getElementById("clearBtn");
        coord = document.getElementById("coord");
        output = document.getElementById("output");
    }

    root.load = function() {
        getDOM();

        canvas.width = 800;
        canvas.height = 300;
        canvas.style.backgroundColor = "rgb(10, 10, 10)";
        ctx = canvas.getContext("2d");

        handleKeys();
        handleButtons();
        monitorMouse();

        mozRequestAnimationFrame(loop);
    }

})(window);

