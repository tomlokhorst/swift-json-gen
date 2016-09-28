//
// A parse function for parsing the AST dump from the swift compiler.
//

interface GlobalAttrs {
  typeAliases: { [ix: string]: string };
  constructors: { [typeName: string]: string[] };
  decoders: string[];
  encoders: string[];
}

interface TypeFuncNames {
  typeName: string;
  constructorParams: string[];
  funcNames: string[];
}

interface TypeAliases {
  [ix: string]: string;
}

interface Struct {
  baseName: string;
  typeArguments: string[];
  varDecls: VarDecl[];
  constructorParams: string[];
  funcNames: string[];
}

interface Enum {
  baseName: string;
  rawTypeName: string;
  constructorParams: string[];
  funcNames: string[];
}

interface Extension {
  typeBaseName: string;
}

interface VarDecl {
  name: string;
  type: Type;
}

interface Type {
  alias?: string;
  baseName: string;
  genericArguments: Type[];
}

function globalAttrs(ast: any[]) : GlobalAttrs {
  var tfns = typeFuncNames(ast);
  var decoders = tfns
    .filter(d => d.funcNames.contains('decodeJson'))
    .map(d => d.typeName);
  var encoders = tfns
    .filter(d => d.funcNames.contains('encodeJson'))
    .map(d => d.typeName);

  var constructors: { [typeName: string]: string[] } = {}
  tfns.forEach(tfn => {
    var xs = constructors[tfn.typeName] || []
    if (tfn.constructorParams.length) {
      constructors[tfn.typeName] = xs.concat(tfn.constructorParams)
    }
  })

  return {
    typeAliases: typeAliases(ast),
    constructors: constructors,
    decoders: decoders,
    encoders: encoders,
  }
}

exports.globalAttrs = globalAttrs;

function typeFuncNames(ast: any[]) : TypeFuncNames[] {
  var emptyAliases: TypeAliases = {};
  var ds1 = structs(ast, emptyAliases)
    .map(s => {
      return {
        typeName: s.baseName,
        constructorParams: s.constructorParams,
        funcNames: s.funcNames
      }
    });
  var ds2 = enums(ast, emptyAliases)
    .map(e => {
      return {
        typeName: e.baseName,
        constructorParams: e.constructorParams,
        funcNames: e.funcNames
      }
    });
  var ds3 = ast
    .children('extension_decl')
    .map(s => {
      return {
        typeName: extension(s).typeBaseName,
        constructorParams: constructorParams(s),
        funcNames: funcNames(s)
      }
    });

  return ds1.concat(ds2).concat(ds3);
}

function funcNames(ast: any[]) : string[] {
  return ast.children('func_decl').map(f => f.key(0) == 'implicit' ? f.key(1) : f.key(0))
}

function constructorParams(ast: any[]) : string[] {
  return ast.children('constructor_decl')
    .filter(a => a.attr('access') != 'private' && a.attr('access') != 'fileprivate')
    .flatMap(constructorDeclParams)
}

function constructorDeclParams(constructorDecl: any[]) : string[] {
  const parts = constructorDecl
    .filter(obj => typeof(obj) == 'object' && obj.length == 1 && typeof(obj[0]) == 'string')
    .map(a => a[0])

  if (parts.length < 3) { return [] }

  const names = parts[0]
  const types = parts[2]

  return [names + '||' + types]
}

function extension(ast: any[]) : Extension {
  var fullName = ast.key(0);
  var keys = ast.keys().slice(1);

  while (fullName.contains('<') && !fullName.contains('>') && keys.length > 0) {
    fullName += keys.splice(0, 1)[0]
  }

  var baseName = fullName.replace(/<([^>]*)>/g, '');

  return { typeBaseName: baseName };
}

function typeAliases(ast: any[]) : TypeAliases {
  var aliases: TypeAliases = {};

  ast.children('typealias')
    .forEach(function (t) {
      var name = t.fields().name().unquote()
      var type = t.attrs().filter(attr => attr[0] == 'type' )[1][1]

      if (!type.startsWith("'") && type.endsWith("'")) {
        type = type.substring(0, type.length - 1)
      }

      aliases[name] = type;
    });

  return aliases;
}

function getBaseName(ast: any[], prefix?: string) : string {
    prefix = prefix ? prefix + '.' : '';

  var fullName = ast.key(0);
  return prefix + fullName.replace(/<([^>]*)>/g, '');
}

function structs(ast: any[], aliases: TypeAliases, prefix?: string) : Struct[] {
  var structs1 = ast.children('struct_decl')
    .map(a => struct(a, aliases, prefix));

  var structs2 = ast.children(['struct_decl', 'enum_decl'])
    .flatMap(a => structs(a, aliases, getBaseName(a, prefix)));

  return structs1.concat(structs2)
}

exports.structs = structs;

function struct(ast: any[], aliases: TypeAliases, prefix?: string) : Struct {

  var baseName = getBaseName(ast, prefix);
  var fullName = ast.key(0);
  var typeArgs = genericArguments(fullName)
  var varDecls = ast.children('var_decl')
    // Swift <= 2.1: storage_kind is 'stored'
    // Swift == 2.2: storage_kind is 'stored_with_trivial_accessors'
    .filter(a => a.attr('storage_kind') == 'stored' || a.attr('storage_kind') == 'stored_with_trivial_accessors')
    .map(a => varDecl(a, aliases));

  var r = {
    baseName: baseName,
    typeArguments: typeArgs,
    varDecls: varDecls,
    constructorParams: constructorParams(ast),
    funcNames: funcNames(ast)
  };

  return r;
}

function enums(ast: any[], aliases: TypeAliases, prefix?: string) : Enum[] {
  var enums1 = ast
    .children('enum_decl')
    .filter(a => {
      var keys = a.keys()
      var ix = keys.indexOf('inherits:')
      return ix > 0 && keys.length > ix + 1
    })
    .map(a => enum_(a, aliases, prefix));

  var enums2 = ast.children(['struct_decl', 'enum_decl'])
    .flatMap(a => enums(a, aliases, getBaseName(a, prefix)));

  return enums1.concat(enums2);
}

exports.enums = enums;

function enum_(ast: any[], aliases: TypeAliases, prefix?: string) : Enum {

  var baseName = getBaseName(ast, prefix);
  var fullName = ast.key(0);

  var keys = ast.keys()
  var ix = keys.indexOf('inherits:')
  var rawTypeName = keys[ix + 1]

  var r = {
    baseName: baseName,
    rawTypeName: rawTypeName,
    constructorParams: constructorParams(ast),
    funcNames: funcNames(ast)
  };

  return r;
}

function genericArguments(fullStructName: String) : string[] {

  var matches = fullStructName.match(/<([^>]*)>/);
  if (matches && matches.length == 2)
    return matches[1].split(',').map(s => s.trim());

  return []
}

function varDecl(ast: any, aliases: TypeAliases) : VarDecl {
  return { name: ast.key(0), type: type(ast.attr('type'), aliases) };
}

function type(typeString: string, aliases: TypeAliases) : Type {

  if (aliases[typeString]) {
    var resolved = type(aliases[typeString], aliases);
    resolved.alias = typeString
    return resolved;
  }

  var isBracketed = typeString.startsWith('[') && typeString.endsWith(']');

  var isGeneric = typeString.match(/\<(.*)>/);
  var isDictionary = isBracketed && typeString.contains(':');
  var isArray = isBracketed && !typeString.contains(':');
  var isOptional = typeString.endsWith('?');

  if (isOptional) {
    var inner = typeString.substring(0, typeString.length - 1).trim();
    return { baseName: 'Optional', genericArguments: [ type(inner, aliases) ] };
  }

  if (isArray) {
    var inner = typeString.substring(1, typeString.length - 1).trim();
    return { baseName: 'Array', genericArguments: [ type(inner, aliases) ] };
  }

  if (isDictionary) {
    var matches = typeString.match(/\[(.*):(.*)\]/);

    if (matches.length != 3)
      throw new Error('"' + typeString + '" appears to be a Dictionary, but isn\'t');

    var keyType = type(matches[1].trim(), aliases);
    var valueType = type(matches[2].trim(), aliases);
    return { baseName: 'Dictionary', genericArguments: [ keyType, valueType ] };
  }

  if (isDictionary) {
    var matches = typeString.match(/\[(.*):(.*)\]/);

    if (matches.length != 3)
      throw new Error('"' + typeString + '" appears to be a Dictionary, but isn\'t');

    var keyType = type(matches[1].trim(), aliases);
    var valueType = type(matches[2].trim(), aliases);
    return { baseName: 'Dictionary', genericArguments: [ keyType, valueType ] };
  }

  if (isGeneric) {
    var baseName = typeString.replace(/<([^>]*)>/g, '');
    var matches = typeString.match(/\<(.*)>/);

    if (matches.length != 2)
      throw new Error('"' + typeString + '" appears to be a generic type, but isn\'t');

    var types = matches[1]
      .split(',')
      .map(t => t.trim())
      .map(mkType);

    return { baseName: baseName, genericArguments: types };
  }

  return { baseName: typeString, genericArguments: [] };
}

function mkType(name: string) : Type {
  return { baseName: name, genericArguments: [] };
}

// Based on: https://github.com/arian/LISP.js
function parse(text) {

  var results = []

  text = text.trim();
  // text = text.replace(/=\[([^\]]*)\]'/g, function (n) { return n.replace(/ /g, 'JSON_GEN_SPACE') } ) // Workaround for swiftc 2.0
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
        return current;
      }

      current = pop;
    }
  }

  var msg = 'INTERNAL ERROR:\n'
    + 'Likely due to errornous output from Swift compiler on some language construct (like a switch or array ializer).\n'
    + 'Workaround: Change all methods from SomeFile.swift into extensions methods in SomeFile+Extensions.swift, which is ignored by JsonGen.\n\n'
    + 'For details, please create an issue (including the failing Swift sources):\nhttps://github.com/tomlokhorst/swift-json-gen/issues';
  console.error(msg)

  throw 'unbalanced parentheses'
};

exports.parse = parse;
