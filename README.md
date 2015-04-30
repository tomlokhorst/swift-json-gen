<img src="https://cloud.githubusercontent.com/assets/75655/5062099/8cc5f3f8-6db3-11e4-8620-c3da216c1262.png" width="218" alt="Swift JsonGen">
<hr>

Generate Json decoders based on Swift structs.

This is all quickly hacked together for my current project.
Let me know if you find this useful!


How it works
------------

This program calls the Swift compiler and dumps the parsed AST.  
(Using the command `xcrun swiftc -dump-ast SomeFile.swift`)

This AST is traversed to look for struct definitions, for each struct a
`decode` function is generated:

```swift
extention SomeStruct {
  static func decode(json : AnyObject) -> SomeStruct? {
    ...
  }
}
```

Installation
------------

Clone this repository and install the package globally:

    > npm install -g


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

This will generate the file `example/Blog+JsonDecode.swift` with the following
content:

```swift
extension Blog {
  static func decode(json: AnyObject) -> Blog? {
    let _dict = json as? [String : AnyObject]
    if _dict == nil { return nil }
    let dict = _dict!

    let id_field: AnyObject? = dict["id"]
    if id_field == nil { assertionFailure("field 'id' is missing"); return nil }
    let id_optional: Int? = Int.decode(id_field!)
    if id_optional == nil { assertionFailure("field 'id' is not Int"); return nil }
    let id: Int = id_optional!

    let name_field: AnyObject? = dict["name"]
    if name_field == nil { assertionFailure("field 'name' is missing"); return nil }
    let name_optional: String? = String.decode(name_field!)
    if name_optional == nil { assertionFailure("field 'name' is not String"); return nil }
    let name: String = name_optional!

    let author_field: AnyObject? = dict["author"]
    let author: String? = author_field == nil ? nil : Optional.decode({ String.decode($0) }, author_field!)

    let needsPassword_field: AnyObject? = dict["needsPassword"]
    if needsPassword_field == nil { assertionFailure("field 'needsPassword' is missing"); return nil }
    let needsPassword_optional: Bool? = Bool.decode(needsPassword_field!)
    if needsPassword_optional == nil { assertionFailure("field 'needsPassword' is not Bool"); return nil }
    let needsPassword: Bool = needsPassword_optional!

    let url_field: AnyObject? = dict["url"]
    if url_field == nil { assertionFailure("field 'url' is missing"); return nil }
    let url_optional: NSURL? = NSURL.decode(url_field!)
    if url_optional == nil { assertionFailure("field 'url' is not NSURL"); return nil }
    let url: NSURL = url_optional!

    return Blog(id: id, name: name, author: author, needsPassword: needsPassword, url: url)
  }
}
```

Compiling
---------

This package is written in TypeScript. To make changes to the code of `swift-json-gen`, first install TypeScript:

    > npm install -g typescript

Edit the `.ts` files and compile the code as follows:

    > tsc lib/*.ts

