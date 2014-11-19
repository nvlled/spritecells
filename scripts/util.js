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

    M.toArray = function(arrayish) {
        return Array.prototype.slice.call(arrayish);
    }

    root.util = M;

})(this);
