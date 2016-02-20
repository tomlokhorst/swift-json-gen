// Deeply nested implementations: https://github.com/tomlokhorst/swift-json-gen/issues/9

typealias X = Int

struct Test11a {
	let s: String

  enum Test11b : X {
    case One = 1
    case Two = 2

    struct Test11c {
      let x: Int

      enum Test11d : X {
        case One = 1
        case Two = 2
      }

//      func encodeJson() -> [String: AnyObject] {
//        var dict: [String: AnyObject] = [:]
//
//        dict["x"] = x.encodeJson()
//
//        return dict
//      }
    }

//    static func decodeJson(json: AnyObject) throws -> Test11b {
//      guard let rawValue = json as? X else {
//        throw JsonDecodeError.WrongType(rawValue: json, expectedType: "X")
//      }
//      guard let value = Test11a.Test11b(rawValue: rawValue) else {
//        throw JsonDecodeError.WrongEnumRawValue(rawValue: rawValue, enumType: "Test11a.Test11b")
//      }
//
//      return value
//    }
  }
}


extension Test11a.Test11b.Test11c.Test11d {

//  func encodeJson() -> X {
//    return rawValue
//  }
}