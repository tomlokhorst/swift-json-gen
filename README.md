<img src="https://cloud.githubusercontent.com/assets/75655/5062099/8cc5f3f8-6db3-11e4-8620-c3da216c1262.png" width="218" alt="Swift JsonGen">
<hr>

JsonGen generates source code files with decoders and encoders for parsing JSON
into immutable Swift structs.

Features
--------

 * Generates an extension with a `decodeJson` and `encodeJson` method for each struct
 * Works on individual `.swift` files or whole directories
 * Handles type aliases
 * Supports primitive types, nested types and custom generic types
 * Allow for part of the datastructure to remain untyped

See also the blog post:
[Swift + JSON with code generation](http://tomlokhorst.tumblr.com/post/119966903324/json-swift-with-code-generation) 


Installation
------------

Install the latest release from NPM:

    > npm install -g swift-json-gen
    
Also copy [`example/JsonGen.swift`](https://raw.githubusercontent.com/tomlokhorst/swift-json-gen/develop/example/JsonGen.swift)
into your own project.
This file contains some encoders and decoders for default Swift and Foundation
types.


How it works
------------

This program calls the Swift compiler and dumps the parsed AST.  
(Using the command `xcrun swiftc -dump-ast SomeFile.swift`)

This AST is traversed to look for struct definitions, for each struct
`decodeJson` and `encodeJson` functions is generated:

```swift
extention SomeStruct {
  static func decodeJson(json: AnyObject) -> SomeStruct? {
    ...
  }
  
  func encodeJson() -> AnyObject {
    ...
  }
}
```

Customization
-------------

If you want to differ from the default generated code you can provide your own
`decodeJson` or `encodeJson` functions. If these already exist, no new
function will be generated.

You also need to provide your own functions for kinds that are not supported,
like enums and classes.


Example
-------

Assuming you have a file `example/Blog.swift` containing one or more structs:

```swift
struct Blog {
  let id: Int
  let name: String
  let author: String?
  let needsPassword : Bool
  let url: NSURL
}
```

To generate Json decoders based a file of structs run:

    > swift-json-gen example/Blog.swift

This will generate the file `example/Blog+JsonGen.swift` with the following
content:

```swift
extension Blog {
  static func decodeJson(json: AnyObject) -> Blog? {
    let _dict = json as? [String : AnyObject]
    if _dict == nil { return nil }
    let dict = _dict!

    let id_field: AnyObject? = dict["id"]
    if id_field == nil { assertionFailure("field 'id' is missing"); return nil }
    let id_optional: Int? = Int.decodeJson(id_field!)
    if id_optional == nil { assertionFailure("field 'id' is not Int"); return nil }
    let id: Int = id_optional!

    let name_field: AnyObject? = dict["name"]
    if name_field == nil { assertionFailure("field 'name' is missing"); return nil }
    let name_optional: String? = String.decodeJson(name_field!)
    if name_optional == nil { assertionFailure("field 'name' is not String"); return nil }
    let name: String = name_optional!

    let author_field: AnyObject? = dict["author"]
    let author: String? = author_field == nil ? nil : Optional.decodeJson({ String.decodeJson($0) }, author_field!)

    let needsPassword_field: AnyObject? = dict["needsPassword"]
    if needsPassword_field == nil { assertionFailure("field 'needsPassword' is missing"); return nil }
    let needsPassword_optional: Bool? = Bool.decodeJson(needsPassword_field!)
    if needsPassword_optional == nil { assertionFailure("field 'needsPassword' is not Bool"); return nil }
    let needsPassword: Bool = needsPassword_optional!

    let url_field: AnyObject? = dict["url"]
    if url_field == nil { assertionFailure("field 'url' is missing"); return nil }
    let url_optional: NSURL? = NSURL.decodeJson(url_field!)
    if url_optional == nil { assertionFailure("field 'url' is not NSURL"); return nil }
    let url: NSURL = url_optional!

    return Blog(id: id, name: name, author: author, needsPassword: needsPassword, url: url)
  }

  func encodeJson() -> AnyObject {
    var dict: [String: AnyObject] = [:]

    dict["id"] = id.encodeJson()
    dict["name"] = name.encodeJson()
    dict["author"] = author.encodeJson({ $0.encodeJson() })
    dict["needsPassword"] = needsPassword.encodeJson()
    dict["url"] = url.encodeJson()

    return dict
  }
}
```

Compiling
---------

This package is written in TypeScript. To make changes to the code of `swift-json-gen`, first install TypeScript:

    > npm install -g typescript

Edit the `.ts` files and compile the code as follows:

    > tsc lib/*.ts


Releases
--------

 - 0.1.3 - 2015-07-22 - Show all Swift compiler errors
 - 0.1.2 - 2015-06-01 - Support for computed properties
 - 0.1.1 - 2015-05-28 - Don't generate empty files
 - **0.1.0** - 2015-05-25 - Initial public release
 - 0.0.0 - 2014-10-11 - Initial private version for project at [Q42](http://q42.com)


Licence & Credits
-----------------

JsonGen is written by [Tom Lokhorst](https://twitter.com/tomlokhorst) of [Q42](http://q42.com) and available under the [MIT license](https://github.com/tomlokhorst/swift-json-gen/blob/develop/LICENSE), so feel free to use it in commercial and non-commercial projects.
