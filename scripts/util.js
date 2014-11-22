"use strict";
(function(root) {

    var M = {};

    M.each = function(obj, fn) {
        var control = {};
        for (var k in obj) {
            if (!obj.hasOwnProperty(k))
                continue;
            fn(obj[k], k, control);
            if (control.stop)
                return control.value;
        }
    }

    M.eachFunc = function(obj, fn) {
        return M.each(obj, function(v, k) {
            if (typeof v === "function")
                fn(v, k);
        });
    }

    M.select = function(obj, keys) {
        var copy = {};
        keys.forEach(function(k) {
            copy[k] = obj[k];
        });
        return copy;
    }

    M.matchValues = function(dest, src) {
        M.each(src, function(v, k) {
            dest[k] = v;
        });
        return dest;
    }

    M.bind = function(obj) {
        for (var k in obj) {
            if (!obj.hasOwnProperty(k))
                continue;
            if (typeof obj[k] !== "function")
                continue;
            obj[k] = obj[k].bind(obj)
        }
        return obj;
    }

    var arrays = {};

    arrays.remove = function(arr, x) {
        var i = arr.indexOf(x);
        if (i >= 0) {
            arr.splice(i, 1);
        }
        return arr;
    }

    arrays.insertAt = function(arr, index, x) {
        arr.splice(index, -1, x);
    }

    arrays.convert = function(arrayish) {
        return Array.prototype.slice.call(arrayish);
    }

    M.arrays = arrays;

    root.util = M;

})(this);
