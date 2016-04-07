//
// A parse function for parsing the AST dump from the swift compiler.
//
// Also extents the Array prototype with a bunch of useful functions for
// inspecting the parsed AST.
//
Array.prototype.name = function () {
    return this[0];
};
Array.prototype.fields = function () {
    var fields = this.slice(1)
        .filter(not(isArray));
    return fields;
};
Array.prototype.contains = function (elem) {
    return this.indexOf(elem) > -1;
};
Array.prototype.unique = function () {
    var unique = [];
    for (var i = 0; i < this.length; i++) {
        if (unique.indexOf(this[i]) == -1) {
            unique.push(this[i]);
        }
    }
    return unique;
};
Array.prototype.keys = function () {
    return this.fields()
        .filter(not(isAttr))
        .map(function (s) {
        if (typeof (s) != 'string')
            return s;
        var val = s.replace(/'/g, '"');
        if (val.length && val[0] == '"')
            val = val.replace(/"/g, '');
        return val;
    });
};
Array.prototype.key = function (ix) {
    var keys = this.keys();
    if (!keys.length)
        throw 'index ' + ix + ' out of bounds for: ' + this;
    return keys[0];
};
Array.prototype.attrs = function () {
    return this.fields()
        .filter(isAttr)
        .map(function (s) {
        var ix = s.indexOf('=');
        var key = s.slice(0, ix);
        var val = s.slice(ix + 1);
        if (val.length > 2 && val.startsWith("'") && val.endsWith("'")) {
            try {
                val = JSON.parse('"' + val.substring(1, val.length - 1) + '"');
            }
            catch (_) {
            }
        }
        return [key, val];
    });
};
Array.prototype.attr = function (key) {
    var attrs = this.attrs()
        .filter(function (arr) {
        return arr[0] == key;
    });
    if (!attrs.length)
        throw 'key "' + key + '" not in: ' + this;
    return attrs[0][1];
};
Array.prototype.children = function (name) {
    var arrays = this.filter(isArray);
    if (name) {
        arrays = arrays.filter(function (arr) {
            return isArray(name) ? name.contains(arr.name()) : arr.name() == name;
        });
    }
    return arrays;
};
Array.prototype.flatMap = function (f) {
    var nested = this.map(f);
    var merged = [];
    return merged.concat.apply(merged, nested);
};
Array.prototype.any = function (predicate) {
    for (var i = 0; i < this.length; i++) {
        if (predicate(this[i])) {
            return true;
        }
    }
    return false;
};
String.prototype.unquote = function () {
    return this.replace(/"(.*)"/g, '$1');
};
if (!String.prototype.startsWith) {
    Object.defineProperty(String.prototype, 'startsWith', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function (searchString, position) {
            position = position || 0;
            return this.lastIndexOf(searchString, position) === position;
        }
    });
}
if (!String.prototype.endsWith) {
    Object.defineProperty(String.prototype, 'endsWith', {
        value: function (searchString, position) {
            var subjectString = this.toString();
            if (position === undefined || position > subjectString.length) {
                position = subjectString.length;
            }
            position -= searchString.length;
            var lastIndex = subjectString.indexOf(searchString, position);
            return lastIndex !== -1 && lastIndex === position;
        }
    });
}
if (!String.prototype.contains) {
    String.prototype.contains = function () {
        'use strict';
        return String.prototype.indexOf.apply(this, arguments) !== -1;
    };
}
function not(f) {
    return function (x) { return !f(x); };
}
function isAttr(s) {
    return s.indexOf('=') > 0;
}
function isArray(obj) {
    return obj === [] || typeof (obj) == 'object' && obj.length;
}
