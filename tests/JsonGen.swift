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
  case MissingField
  case WrongType(rawValue: AnyObject, expectedType: String)
  case WrongEnumRawValue(rawValue: AnyObject, enumType: String)
  case ArrayElementErrors([Int: JsonDecodeError])
  case DictionaryErrors([String: JsonDecodeError])
  case StructErrors(type: String, errors: [String: JsonDecodeError])
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
    do {
      return try decodeWrapped(json)
    }
    catch let error as JsonDecodeError {
      if case let .WrongType(rawValue: rawValue, expectedType: expectedType) = error {
        throw JsonDecodeError.WrongType(rawValue: rawValue, expectedType: "\(expectedType)?")
      }

      throw error
    }
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

extension JsonDecodeError: CustomStringConvertible {

  var description: String {
    return multiline(Verbosity.Multiple).joinWithSeparator("\n")
  }

  var fullDescription: String {
    return multiline(Verbosity.Full).joinWithSeparator("\n")
  }

  private enum Verbosity {
    case Full
    case Multiple
    case Single

    func to(other: Verbosity) -> Verbosity {
      if case .Full = self { return .Full }
      return other
    }
  }

  private func multiline(verbosity: Verbosity) -> [String] {
    switch self {
    case .MissingField, .WrongType, .WrongEnumRawValue:
      return [self.line]

    case .ArrayElementErrors(let errors):
      let errs = errors.map { (ix, err) in ("[\(ix)]", err) }
      return JsonDecodeError.lines(verbosity, type: "array", errors: errs)

    case .DictionaryErrors(let errors):
      let errs = errors.map { (key, err) in ("\(key):", err) }
      return JsonDecodeError.lines(verbosity, type: "dictionary", errors: errs)

    case .StructErrors(let type, let errors):
      let errs = errors.map { (key, err) in ("\(key):", err) }
      return JsonDecodeError.lines(verbosity, type: "\(type) struct", errors: errs)
    }
  }

  private var line: String {
    switch self {
    case .MissingField:
      return "Field missing"

    case let .WrongType(rawValue, expectedType):
      return "Value is not of expected type \(expectedType): `\(rawValue)`"

    case let .WrongEnumRawValue(rawValue, enumType):
      return "`\(rawValue)` is not a valid case in enum \(enumType)"

    case let .ArrayElementErrors(errors):
      return errors.count == 1
        ? "(1 error in an array element)"
        : "(\(errors.count) errors in array elements)"

    case let .DictionaryErrors(errors):
      return errors.count == 1
        ? "(1 error in dictionary)"
        : "(\(errors.count) errors in dictionary)"

    case let .StructErrors(type, errors):
      return errors.count == 1
        ? "(1 error in nested \(type) struct)"
        : "(\(errors.count) errors in nested \(type) struct)"
    }
  }

  private func listItem(collapsed collapsed: Bool) -> String {
    switch self {
    case .MissingField, .WrongType, .WrongEnumRawValue:
      return "-"

    case .ArrayElementErrors, .DictionaryErrors, .StructErrors:
      return collapsed ? "▹" : "▿"
    }
  }

  private static func lines(verbosity: Verbosity, type: String, errors: [(String, JsonDecodeError)]) -> [String] {
    if errors.count == 0 { return [] }

    func prefix(prefix: String, lines: [String]) -> [String] {
      if let first = lines.first {
        return ["\(prefix)\(first)"] + lines.suffixFrom(1).map { "   \($0)" }
      }

      return []
    }

    var result: [String] = []
    let multiple = errors.count > 1

    let head = multiple
      ? "\(errors.count) errors in \(type)"
      : "1 error in \(type)"
    result.append(head)

    for (key, error) in errors {
      if multiple && verbosity == .Single {
        result.append(" \(error.listItem(collapsed: true)) \(key) \(error.line)")
      }
      else {
        let lines = error.multiline(verbosity.to(.Single))
        result = result + prefix(" \(error.listItem(collapsed: false)) \(key) ", lines: lines)
      }
    }

    return result
  }
}
