<img src="https://cloud.githubusercontent.com/assets/75655/5062099/8cc5f3f8-6db3-11e4-8620-c3da216c1262.png" width="218" alt="Swift JsonGen">
<hr>

JsonGen generates source code files with decoders and encoders for parsing JSON into immutable Swift structs.

Features
--------

 * Generates an extension with a `decodeJson` and `encodeJson` method for each struct
 * Works on individual `.swift` files or whole directories
 * Handles type aliases
 * Supports primitive types, nested types and custom generic types
 * Allow for custom encoders and decoders
 * Allow for part of the datastructure to remain untyped
 * Excelent error messages when JSON decoding fails: [Improving error messages](http://q42.com/blog/post/134258806788/improving-error-messages-from-generated-json)

Here's an example of a nice, detailed error message:

```swift
2 errors in Blog struct
 - subTitle: Value is not of expected type String?: `42`
 ▿ posts: 2 errors in array
    ▿ [1] 1 error in Post struct
       - title: Field missing
    ▿ [2] 3 errors in Post struct
       - title: Value is not of expected type String: `1`
       - body: Value is not of expected type String: `42`
       ▿ author: 2 errors in Author struct
          - name: Field missing
          - email: Field missing
```

See also the blog post:
[Swift + JSON with code generation](http://tomlokhorst.tumblr.com/post/119966903324/json-swift-with-code-generation)


CocoaHeadsNL presentation
-------------------------

Tom Lokhorst presented at the January 2016 CocoaHeadsNL meetup.
Comparing several Json decoding libraries for Swift and talking about code generation with JsonGen.

<a href="https://vimeo.com/152054122"><img src="https://i.vimeocdn.com/video/551951015.jpg?mw=960&mh=540" width="560"></a>


Installation
------------

Install the latest release from NPM:

    > npm install -g swift-json-gen

Include the [Statham](https://github.com/tomlokhorst/Statham) swift library in your own project.
This library contains some encoders and decoders for default Swift and Foundation types.

With CocoaPods, this can be done with:

    pod 'Statham'


Example
-------

Assuming you have a file `example/Blog.swift` containing one or more structs:

```swift
struct Blog {
  let id: Int
  let name: String
  let author: String?
  let needsPassword: Bool
  let url: URL
}
```

To generate Json decoders based a file of structs run:

    > swift-json-gen example/Blog.swift


This will generate the file
[`example/Blog+JsonGen.swift`](https://raw.githubusercontent.com/tomlokhorst/swift-json-gen/develop/example/Blog+JsonGen.swift)
with the following (truncated) content:

```swift
extension Blog {
  static func decodeJson(json: Any) throws -> Blog {
    let decoder = try JsonDecoder(json: json)

    let _id = try decoder.decode("id", decoder: Int.decodeJson)
    let _name = try decoder.decode("name", decoder: String.decodeJson)
    let _author = try decoder.decode("author", decoder: Optional.decodeJson(String.decodeJson))
    let _needsPassword = try decoder.decode("needsPassword", decoder: Bool.decodeJson)
    let _url = try decoder.decode("url", decoder: URL.decodeJson)

    guard
      let id = _id,
      let name = _name,
      let author = _author,
      let needsPassword = _needsPassword,
      let url = _url
    else {
      throw JsonDecodeError.structErrors(type: "Blog", errors: decoder.errors)
    }

    return Blog(id: id, name: name, author: author, needsPassword: needsPassword, url: url)
  }

  func encodeJson() -> [String: Any] {
    var dict: [String: Any] = [:]

    dict["id"] = id.encodeJson()
    dict["name"] = name.encodeJson()
    dict["author"] = author.encodeJson({ $0.encodeJson() })
    dict["needsPassword"] = needsPassword.encodeJson()
    dict["url"] = url.encodeJson()

    return dict
  }
}
```


Usage
-----

Include the generated `YourFile+JsonGen.swift` file into your project. Make sure you've also included the [Statham](https://github.com/tomlokhorst/Statham) library.

The generated encoder and decoder can be used in conjunction with NSJSONSerialization like so:

```swift
let inputStr = "{ \"title\": \"Hello, World!\", \"published\": true, \"author\": { \"first\": \"Tom\", \"last\": \"Lokhorst\" } }"
let inputData = inputStr.data(using: .utf8)!
let inputObj = try! JSONSerialization.jsonObject(with: inputData, options: [])

let blog = try! Blog.decodeJson(inputObj)

let outputObj = blog.encodeJson()
let outputData = try! JSONSerialization.data(withJSONObject: outputObj, options: .prettyPrinted)
let outputStr = String(data: outputData, encoding: .utf8)!
```


Customization
-------------

If you want to differ from the default generated code you can provide your own
`decodeJson` or `encodeJson` functions. If these already exist, no new
function will be generated.

You also need to provide your own functions for kinds that are not supported,
like enums and classes.


How it works
------------

This program calls the Swift compiler and dumps the parsed AST.
(Using the command `xcrun swiftc -dump-ast SomeFile.swift`)

This AST is traversed to look for struct definitions, for each struct
`decodeJson` and `encodeJson` functions is generated:

```swift
extension SomeStruct {
  static func decodeJson(_ json: Any) throws -> SomeStruct {
    ...
  }

  func encodeJson() -> Any {
    ...
  }
}
```


Compiling
---------

This package is written in TypeScript. To make changes to the code of JsonGen, first install TypeScript:

    > npm install -g typescript

Edit the `.ts` files and compile the code as follows:

    > tsc


Releases
--------

 - 1.2.0 - 2017-03-09 - Swift 3.1 support
 - 1.1.0 - 2017-03-07 - Add `--accessLevel` flag
 - **1.0.0** - 2016-09-30 - Swift 3 support
 - 0.8.0 - 2016-09-29 - Swift 2.3 support
 - 0.7.0 - 2016-04-07 - Generate missing `init`
 - 0.6.0 - 2016-03-03 - Move JsonGen.swift to separate library [Statham](https://github.com/tomlokhorst/Statham)
 - 0.5.0 - 2016-02-29 - Adds `--output` option for providing an output directory
 - 0.4.0 - 2016-02-21 - Generate code based on JsonDecodable class
 - 0.3.0 - 2015-11-19 - Decoders with `throws`, instead of returning an optional
 - 0.2.2 - 2015-09-22 - Bugfix, show correct error on missing field
 - 0.2.1 - 2015-09-14 - Bugfix, now works with released Xcode
 - **0.2.0** - 2015-09-11 - Update to Swift 2
 - 0.1.3 - 2015-07-22 - Show all Swift compiler errors
 - 0.1.2 - 2015-06-01 - Support for computed properties
 - 0.1.1 - 2015-05-28 - Don't generate empty files
 - **0.1.0** - 2015-05-25 - Initial public release
 - 0.0.0 - 2014-10-11 - Initial private version for project at [Q42](http://q42.com)


Licence & Credits
-----------------

JsonGen is written by [Tom Lokhorst](https://twitter.com/tomlokhorst) of [Q42](http://q42.com)
and available under the [MIT license](https://github.com/tomlokhorst/swift-json-gen/blob/develop/LICENSE),
so feel free to use it in commercial and non-commercial projects.
