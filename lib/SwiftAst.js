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
Array.prototype.keys = function () {
    return this.fields()
        .filter(not(isAttr))
        .map(function (s) {
        var val = s.replace(/'/g, '"');
        if (val.length && val[0] == '"')
            val = JSON.parse(val);
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
        var val = s.slice(ix + 1).replace(/'/g, '"');
        if (val.length && val[0] == '"') {
            try {
                val = JSON.parse(val);
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
            return arr.name() == name;
        });
    }
    return arrays;
};
Array.prototype.flatMap = function (f) {
    var nested = this.map(f);
    var merged = [];
    return merged.concat.apply(merged, nested);
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
function not(f) {
    return function (x) { return !f(x); };
}
function isAttr(s) {
    return s.indexOf('=') > 0;
}
function isArray(obj) {
    return obj === [] || typeof (obj) == 'object' && obj.length;
}
// Based on: https://github.com/arian/LISP.js
function parse(text, multiple) {
    var results = [];
    text = text.trim();
    text = text.replace(/='([^']*)'/g, function (n) { return n.replace(/ /g, 'JSON_GEN_SPACE'); });
    if (text.charAt(0) != '(')
        return text;
    var stack = [];
    var token;
    var tokens = '';
    var inString = false;
    var i = 0;
    var current;
    while (i < text.length) {
        token = text.charAt(i++);
        var isOpen = token == '(';
        var isClose = token == ')';
        var isSpace = token == ' ' && !inString;
        if (isOpen || isClose || isSpace) {
            if (current && tokens.length) {
                var n = +tokens;
                var tokens_ = tokens.replace(/JSON_GEN_SPACE/g, ' ');
                current.push(isNaN(n) ? tokens_ : n);
            }
            tokens = '';
        }
        else {
            if (token == '"')
                inString = !inString;
            if (!/\s/.test(token) || inString)
                tokens += token;
        }
        if (isOpen) {
            var previous = current;
            current = [];
            if (previous) {
                stack.push(previous);
                previous.push(current);
            }
        }
        else if (isClose) {
            var pop = stack.pop();
            if (!pop) {
                if (multiple) {
                    results.push(current);
                    current = undefined;
                }
                else {
                    return current;
                }
            }
            current = pop;
        }
    }
    if (multiple)
        return results;
    throw 'unbalanced parentheses';
}
;
exports.parse = parse;
