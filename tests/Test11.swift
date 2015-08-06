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

//      func encodeJson() -> AnyObject {
//        var dict: [String: AnyObject] = [:]
//
//        dict["x"] = x.encodeJson()
//
//        return dict
//      }
    }

//    static func decodeJson(json: AnyObject) -> Test11b? {
//      if let value = json as? X {
//        return Test11b(rawValue: value)
//      }
//      return nil
//    }
  }
}


extension Test11a.Test11b.Test11c.Test11d {

  func encodeJson() -> AnyObject {
    return rawValue
  }
}