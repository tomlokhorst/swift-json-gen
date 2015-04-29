//
//  JsonDecode.swift
//
//  Decoders for some base Swift and Foundation types.
//

import Foundation

typealias AnyJson = AnyObject
typealias JsonObject = [String: AnyJson]
typealias JsonArray = [AnyJson]

extension String {
  static func decode(json: AnyObject) -> String? {
    return json as? String
  }
}

extension Bool {
  static func decode(json: AnyObject) -> Bool? {
    return json as? Bool
  }
}

extension Int {
  static func decode(json: AnyObject) -> Int? {
    return json as? Int
  }
}

extension Int64 {
  static func decode(json: AnyObject) -> Int64? {
    let number = json as? NSNumber
    return number.map { $0.longLongValue }
  }
}

extension Double {
  static func decode(json : AnyObject) -> Double? {
    let number = json as? NSNumber
    return number.map { $0.doubleValue }
  }
}

extension NSURL {
  class func decode(json: AnyObject) -> NSURL? {
    if let str = json as? String {
      return NSURL(string: str)
    }

    return nil
  }
}

extension NSDate
{
  struct JsonDecodeDateFormatter {
    static let withTimeZone : NSDateFormatter = {
      let formatter = NSDateFormatter()
      formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ssZZZZZ"

      return formatter
      }()
  }

  class func decode(json : AnyObject) -> NSDate? {
    if let dateString = json as? String {
      return JsonDecodeDateFormatter.withTimeZone.dateFromString(dateString)
    }

    return nil
  }
}

extension Optional {
  static func decode(decodeT: AnyObject -> T?)(json: AnyObject) -> T? {
    return decodeT(json)
  }
}

extension Array {
  static func decode(decodeT: AnyObject -> T?)(json: AnyObject) -> [T]? {
    if let arr = json as? [AnyObject] {
      let decoded = arr.map(decodeT)

      if decoded.filter({ $0 == nil }).first != nil {
        return nil
      }

      return decoded.map { $0! }
    }

    return nil
  }
}

extension Dictionary {
  static func decode(decodeValue: AnyObject -> Value?)(json: AnyObject) -> [String: Value]? {
    var result = [String: Value]()

    if let dict = json as? [String: AnyObject] {
      for (key, val) in dict {
        if let value = decodeValue(val) {
          result[key] = value
        }
        else {
          return nil
        }
      }
    }

    return nil
  }
}
