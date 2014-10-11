Swift JsonGen
=============

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
  static func decode(json : AnyObject) -> Blog? {
    let _dict = json as? [String : AnyObject]
    if _dict == nil { return nil }
    let dict = _dict!

    let id_field : AnyObject? = dict["id"]
    if id_field == nil { assertionFailure("field id missing"); return nil }
    let id_optional = Int.decode(id_field!)
    if id_optional == nil { assertionFailure("field id not a Int"); return nil }
    let id = id_optional!
    
    let name_field : AnyObject? = dict["name"]
    if name_field == nil { assertionFailure("field name missing"); return nil }
    let name_optional = String.decode(name_field!)
    if name_optional == nil { assertionFailure("field name not a String"); return nil }
    let name = name_optional!
    
    let author_field : AnyObject? = dict["author"]
    let author = author_field == nil ? nil : String.decode(author_field!)
    
    let needsPassword_field : AnyObject? = dict["needsPassword"]
    if needsPassword_field == nil { assertionFailure("field needsPassword missing"); return nil }
    let needsPassword_optional = Bool.decode(needsPassword_field!)
    if needsPassword_optional == nil { assertionFailure("field needsPassword not a Bool"); return nil }
    let needsPassword = needsPassword_optional!
    
    let url_field : AnyObject? = dict["url"]
    if url_field == nil { assertionFailure("field url missing"); return nil }
    let url_optional = NSURL.decode(url_field!)
    if url_optional == nil { assertionFailure("field url not a NSURL"); return nil }
    let url = url_optional!
    
    return Blog(id: id, name: name, author: author, needsPassword: needsPassword, url: url)
  }
}
```

