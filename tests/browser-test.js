"use strict";
(function() {

    window.addEventListener("load", runTests);

    var logoutput;

    function runTests() {
        logoutput = document.querySelector("#log") || document.body;
        for (var name in tests) {
            var p = document.createElement("h3");
            p.textContent = name;
            logoutput.appendChild(p);
            tests[name]();
        }
    }

    var tests = {
        "actionHistory" : function() {
            var value = 0;
            var increment = {
                exec : function() { this.redo() },
                undo : function() { value-- },
                redo : function() { value++ },
            }
            var timesFive = {
                exec : function() { this.redo() },
                undo : function() { value /= 5 },
                redo : function() { value *= 5 },
            }
            var minus20 = {
                exec : function() { this.redo() },
                undo : function() { value += 20 },
                redo : function() { value -= 20 },
            }
            var history = new types.ActionHistory();

            assert(true, value)

            // no actions, no effect
            history.redo();
            history.undo();
            history.undo();
            history.redo();

            history.perform(increment);

            assert(value == 1, "+1="+value);
            history.redo();
            history.redo();
            history.redo();
            assert(value == 1, "redo +1="+value);
            history.undo();
            history.undo();
            assert(value == 0, "undo +1="+value);
            history.redo();
            assert(value == 1, "redo +1="+value);

            history.perform(timesFive);

            assert(value == 5, "x5="+value);
            history.redo();
            assert(value == 5, "redo x5="+value);
            history.undo();
            assert(value == 1, "undo x5="+value);
            history.undo();
            assert(value == 0, "undo +1="+value);
            history.undo();
            assert(value == 0, "undo +1="+value);
            history.redo();
            assert(value == 1, "redo +1="+value);
            history.redo();
            assert(value == 5, "redo x5="+value);

            history.perform(increment);
            assert(value == 6, "+1="+value);

            history.perform(timesFive);
            assert(value == 30, "x5="+value);

            for (var i = 0; i < 20; i++)
                history.undo();
            assert(value == 0, "undo everything="+value);

            for (var i = 0; i < 20; i++)
                history.redo();
            assert(value == 30, "redo everything="+value);

            history.undo();
            assert(value == 6, "undo x5="+value);

            history.perform(increment);
            assert(value == 7, "+1="+value);

            history.perform(increment);
            assert(value == 8, "+1="+value);

            for (var i = 0; i < 20; i++)
                history.undo();
            assert(value == 0, "undo everything="+value);

            for (var i = 0; i < 20; i++)
                history.redo();
            assert(value == 8, "redo everything="+value);

            for (var i = 0; i < 20; i++)
                history.undo();
            assert(value == 0, "undo everything="+value);

            history.perform(minus20);
            assert(value == -20, "-20="+value);
            history.redo();
            assert(value == -20, "-20="+value);

            history.perform(increment);
            assert(value == -19, "+1="+value);
        },
        "utils" : function() {
            var obj = {
                x : 1,
                y : 2,
                f : function() {  },
                g : function() {  },
            }

            var result;

            result = [];
            util.each(obj, function(v, k) {
                result.push(k);
            });
            assertEqualArray(result, ["x", "y", "f", "g"], "util.each");

            result = [];
            util.eachFunc(obj, function(v, k) {
                result.push(k);
            });
            assertEqualArray(result, ["f", "g"], "util.eachFunc");
            util.eachFunc(obj, function(v, k) {
                assert(typeof v === "function", "--> "+ k);
            });

            result = util.select(obj, ["x", "f"])
            assertEqualArray(Object.keys(result), ["x", "f"], "util.select");

            result = util.matchValues({x: 1, y: 2, w: 3}, {x: 5, y: 6, z: 7});
            assertEqualObject(result, {x: 5, y: 6, z: 7, w: 3}, "util.matchValues");

            obj = util.bind({
                x : 0,
                f : function() {this.x+=  1},
                g : function() {this.x+= 10},
                h : function() {this.x+=100},
            })
            util.eachFunc(obj, function(fn) {
                fn();
            });
            assert(obj.x === 111, "util.bind");

            var arrays = util.arrays;
            var xs = [1,2,3,4];
            arrays.insertAt(xs, 2, -1);
            assertEqualArray(xs, [1,2, -1, 3, 4], "util.array.insertAt");

            arrays.remove(xs, -1);
            arrays.remove(xs, -123);
            arrays.remove(xs, 1);
            assertEqualArray(xs, [2,3, 4], "util.array.remove");
            assertEqualArray(arrays.remove([], 'x'), [], "util.array.remove");
        },
    }


    function assertEqualArray(a1, a2, msg) {
        assert(equalArrays(a1, a2), msg || "arrays match");
    }
    function assertEqualObject(a, b, msg) {
        assert(equalValues(a, b), msg || "objects match");
    }

    function assert(ok, msg) {
        var p = document.createElement("p");
        p.classList.add(ok ? "pass" : "fail");
        p.textContent = "* "+msg;
        logoutput.appendChild(p);
        console.assert(ok, msg)
    }

    function equalValues(obj1, obj2) {
        for(var k in obj1) {
            if (!obj1.hasOwnProperty(k))
                continue;
            if (obj1[k] != obj2[k])
                return false;
        }
        for(var k in obj2) {
            if (!obj2.hasOwnProperty(k))
                continue;
            if (obj1[k] != obj2[k])
                return false;
        }
        return true;
    }

    function equalArrays(a1, a2) {
        if (a1.length != a2.length)
            return false;
        for (var i = 0; i < a1.length; i++) {
            if (a1[i] != a2[i])
                return false;
        }
        return true;
    }
})();
