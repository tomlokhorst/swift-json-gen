//
//  JsonGen.swift
//
//  Json encoders and decoders for some base Swift and Foundation types.
//

import Foundation

typealias AnyJson = AnyObject
typealias JsonObject = [String: AnyJson]
typealias JsonArray = [AnyJson]

enum JsonDecodeError : ErrorType {
  case WrongType(rawValue: AnyObject, expectedType: String)
  case WrongEnumRawValue(rawValue: AnyObject, enumType: String)
  case MissingField(name: String)
  case ArrayElementErrors([Int: JsonDecodeError])
  case DictionaryErrors([String: JsonDecodeError])
  case StructErrors([String: JsonDecodeError])
}

extension String {
  static func decodeJson(json: AnyObject) throws -> String {
    guard let result = json as? String else {
      throw JsonDecodeError.WrongType(rawValue: json, expectedType: "String")
    }

    return result
  }

  func encodeJson() -> String {
    return self
  }
}

extension Bool {
  static func decodeJson(json: AnyObject) throws -> Bool {
    guard let result = json as? Bool else {
      throw JsonDecodeError.WrongType(rawValue: json, expectedType: "Bool")
    }

    return result
  }

  func encodeJson() -> Bool {
    return self
  }
}

extension Int {
  static func decodeJson(json: AnyObject) throws -> Int {
    guard let result = json as? Int else {
      throw JsonDecodeError.WrongType(rawValue: json, expectedType: "Int")
    }

    return result
  }

  func encodeJson() -> Int {
    return self
  }
}

extension UInt {
  static func decodeJson(json: AnyObject) throws -> UInt {
    guard let result = json as? UInt else {
      throw JsonDecodeError.WrongType(rawValue: json, expectedType: "UInt")
    }

    return result
  }

  func encodeJson() -> UInt {
    return self
  }
}

extension Int64 {
  static func decodeJson(json: AnyObject) throws -> Int64 {
    guard let number = json as? NSNumber else {
      throw JsonDecodeError.WrongType(rawValue: json, expectedType: "Int64")
    }

    return number.longLongValue
  }

  func encodeJson() -> NSNumber {
    return NSNumber(longLong: self)
  }
}

extension Float {
  static func decodeJson(json : AnyObject) throws -> Float {
    guard let number = json as? NSNumber else {
      throw JsonDecodeError.WrongType(rawValue: json, expectedType: "Float")
    }

    return number.floatValue
  }

  func encodeJson() -> Float {
    return self
  }
}

extension Double {
  static func decodeJson(json : AnyObject) throws -> Double {
    guard let number = json as? NSNumber else {
      throw JsonDecodeError.WrongType(rawValue: json, expectedType: "Double")
    }

    return number.doubleValue
  }

  func encodeJson() -> Double {
    return self
  }
}

extension NSDictionary {
  class func decodeJson(json: AnyObject) throws -> NSDictionary {
    guard let result = json as? NSDictionary else {
      throw JsonDecodeError.WrongType(rawValue: json, expectedType: "NSDictionary")
    }

    return result
  }

  func encodeJson() -> NSDictionary {
    return self
  }
}

extension NSURL {
  class func decodeJson(json: AnyObject) throws -> NSURL {
    guard let str = json as? String,
          let result = NSURL(string: str)
    else {
      throw JsonDecodeError.WrongType(rawValue: json, expectedType: "NSURL")
    }

    return result
  }

  func encodeJson() -> NSObject {
    return self.absoluteString ?? NSNull()
  }
}

extension NSDate
{
  struct JsonGenDateFormatter {
    static let withTimeZone : NSDateFormatter = {
      let formatter = NSDateFormatter()
      formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ssZZZZZ"

      return formatter
      }()
  }

  class func decodeJson(json : AnyObject) throws -> NSDate {
    guard let str = json as? String,
          let result = JsonGenDateFormatter.withTimeZone.dateFromString(str)
    else {
      throw JsonDecodeError.WrongType(rawValue: json, expectedType: "ISO 8601 formatted NSDate")
    }

    return result
  }

  func encodeJson() -> String {
    return JsonGenDateFormatter.withTimeZone.stringFromDate(self)
  }
}

extension Optional {
  static func decodeJson(decodeWrapped: AnyObject throws -> Wrapped, _ json: AnyObject) throws -> Wrapped {
    return try decodeWrapped(json)
  }

  func encodeJson(encodeJsonWrapped: Wrapped -> AnyObject) -> AnyObject {
    return self.map(encodeJsonWrapped) ?? NSNull()
  }
}

extension Array {
  static func decodeJson(decodeElement: AnyObject throws -> Element, _ json: AnyObject) throws -> [Element] {
    guard let arr = json as? [AnyObject] else {
      throw JsonDecodeError.WrongType(rawValue: json, expectedType: "Array")
    }

    var errors: [Int: JsonDecodeError] = [:]
    var result: [Element] = []

    for (index, element) in arr.enumerate() {
      do {
        result.append(try decodeElement(element))
      }
      catch let error as JsonDecodeError {
        errors[index] = error
      }
    }

    if errors.count > 0 {
      throw JsonDecodeError.ArrayElementErrors(errors)
    }

    return result
  }

  func encodeJson(encodeJsonElement: Element -> AnyObject) -> [AnyObject] {
    return self.map(encodeJsonElement)
  }
}

extension Dictionary {
  static func decodeJson(decodeKey: AnyObject throws -> Key, _ decodeValue: AnyObject throws -> Value, _ json: AnyObject) throws -> [Key: Value] {

    guard let dict = json as? [Key: AnyObject] else {
      throw JsonDecodeError.WrongType(rawValue: json, expectedType: "Dictionary")
    }

    var errors: [String: JsonDecodeError] = [:]
    var result: [Key: Value] = [:]

    for (key, val) in dict {
      do {
        result[key] = try decodeValue(val)
      }
      catch let error as JsonDecodeError {
        errors["\(key)"] = error
      }
    }

    if errors.count > 0 {
      throw JsonDecodeError.DictionaryErrors(errors)
    }

    return result
  }

  func encodeJson(encodeJsonKey: Key -> String, _ encodeJsonValue: Value -> AnyObject) -> [String: AnyObject] {
    var dict: [String: AnyObject] = [:]

    for (key, val) in self {
      let keyString = encodeJsonKey(key)
      dict[keyString] = encodeJsonValue(val)
    }

    for (key, value) in self {
      dict[encodeJsonKey(key)] = encodeJsonValue(value)
    }

    return dict
  }
}
