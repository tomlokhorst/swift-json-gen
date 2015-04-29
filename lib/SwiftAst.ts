// 
// A parse function for parsing the AST dump from the swift compiler.
//

interface Struct {
  baseName: string;
  data: any[];
}

function structs(ast: any[]) : Struct[] {
  return ast.children('struct_decl').flatMap(a => struct(a));
}

exports.structs = structs;

function struct(ast: any[], prefix?: string) : Struct[] {

  prefix = prefix ? prefix + '.' : '';

  // strip generic type
  var fullName = ast.key(0);
  var baseName = prefix + fullName.replace(/<([^>]*)>/g, '' );

  var r = { baseName: baseName, data: ast };
  var rs = ast.children('struct_decl').flatMap(a => struct(a, baseName));

  return [r].concat(rs);
}

// Based on: https://github.com/arian/LISP.js
function parse(text, multiple) {

  var results = []

  text = text.trim();
  text = text.replace(/='([^']*)'/g, function (n) { return n.replace(/ /g, 'JSON_GEN_SPACE') } )
  text = text.replace(/"<([^>]*)>/g, function (n) { return n.replace(/ /g, 'JSON_GEN_SPACE') } )

  if (text.charAt(0) != '(') return text;

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
        var tokens_ = tokens.replace(/JSON_GEN_SPACE/g, ' ')
        current.push(isNaN(n) ? tokens_ : n);
      }
      tokens = '';
    } else {
      if (token == '"') inString = !inString;
      if (!/\s/.test(token) || inString) tokens += token;
    }

    if (isOpen) {

      var previous = current;
      current = [];

      if (previous){
        stack.push(previous);
        previous.push(current);
      }

    } else if (isClose) {

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

  if (multiple) return results;

  throw 'unbalanced parentheses';
};

exports.parse = parse;

