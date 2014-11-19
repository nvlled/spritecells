"use strict";
(function() {

    window.addEventListener("load", runTests);

    var logoutput;

    function runTests() {
        logoutput = document.querySelector("#log") ||
            document.body;
        console.log(logoutput);
        testUtils();
    }

    function testUtils() {
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
    }

    function assertEqualArray(a1, a2, msg) {
        assert(equalArrays(a1, a2), msg || "arrays match");
    }
    function assertEqualObject(a, b, msg) {
        assert(equalValues(a, b), msg || "objects match");
    }

    function assert(ok, msg) {
        var li = document.createElement("li");
        li.classList.add(ok ? "pass" : "fail");
        li.textContent = msg;
        logoutput.appendChild(li);
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
