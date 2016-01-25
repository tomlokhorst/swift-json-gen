//
//  JsonGen.swift
//
//  Json encoders and decoders for some base Swift and Foundation types.
//

import Foundation

public typealias AnyJson = AnyObject
public typealias JsonObject = [String: AnyJson]
public typealias JsonArray = [AnyJson]

public enum JsonDecodeError : ErrorType {
  case MissingField
  case WrongType(rawValue: AnyObject, expectedType: String)
  case WrongEnumRawValue(rawValue: AnyObject, enumType: String)
  case ArrayElementErrors([Int: JsonDecodeError])
  case DictionaryErrors([String: JsonDecodeError])
  case StructErrors(type: String, errors: [String: JsonDecodeError])
}

// Decode function for JsonObject.
// Would be nicer as an extension method.
public func JsonObject_decodeJson(json: AnyObject) throws -> JsonObject {
  guard let result = json as? JsonObject else {
    throw JsonDecodeError.WrongType(rawValue: json, expectedType: "JsonObject")
  }

  return result
}

extension String {
  public static func decodeJson(json: AnyObject) throws -> String {
    guard let result = json as? String else {
      throw JsonDecodeError.WrongType(rawValue: json, expectedType: "String")
    }

    return result
  }

  public func encodeJson() -> String {
    return self
  }
}

extension Bool {
  public static func decodeJson(json: AnyObject) throws -> Bool {
    guard let result = json as? Bool else {
      throw JsonDecodeError.WrongType(rawValue: json, expectedType: "Bool")
    }

    return result
  }

  public func encodeJson() -> Bool {
    return self
  }
}

extension Int {
  public static func decodeJson(json: AnyObject) throws -> Int {
    guard let result = json as? Int else {
      throw JsonDecodeError.WrongType(rawValue: json, expectedType: "Int")
    }

    return result
  }

  public func encodeJson() -> Int {
    return self
  }
}

extension UInt {
  public static func decodeJson(json: AnyObject) throws -> UInt {
    guard let result = json as? UInt else {
      throw JsonDecodeError.WrongType(rawValue: json, expectedType: "UInt")
    }

    return result
  }

  public func encodeJson() -> UInt {
    return self
  }
}

extension Int64 {
  public static func decodeJson(json: AnyObject) throws -> Int64 {
    guard let number = json as? NSNumber else {
      throw JsonDecodeError.WrongType(rawValue: json, expectedType: "Int64")
    }

    return number.longLongValue
  }

  public func encodeJson() -> NSNumber {
    return NSNumber(longLong: self)
  }
}

extension Float {
  public static func decodeJson(json : AnyObject) throws -> Float {
    guard let number = json as? NSNumber else {
      throw JsonDecodeError.WrongType(rawValue: json, expectedType: "Float")
    }

    return number.floatValue
  }

  public func encodeJson() -> Float {
    return self
  }
}

extension Double {
  public static func decodeJson(json : AnyObject) throws -> Double {
    guard let number = json as? NSNumber else {
      throw JsonDecodeError.WrongType(rawValue: json, expectedType: "Double")
    }

    return number.doubleValue
  }

  public func encodeJson() -> Double {
    return self
  }
}

extension NSDictionary {
  public static func decodeJson(json: AnyObject) throws -> NSDictionary {
    guard let result = json as? NSDictionary else {
      throw JsonDecodeError.WrongType(rawValue: json, expectedType: "NSDictionary")
    }

    return result
  }

  public func encodeJson() -> NSDictionary {
    return self
  }
}

extension NSURL {
  public static func decodeJson(json: AnyObject) throws -> NSURL {
    guard let str = json as? String,
          let result = NSURL(string: str)
    else {
      throw JsonDecodeError.WrongType(rawValue: json, expectedType: "NSURL")
    }

    return result
  }

  public func encodeJson() -> NSObject {
    return self.absoluteString ?? NSNull()
  }
}

extension NSDate
{
  private struct JsonGenDateFormatter {
    static let withTimeZone : NSDateFormatter = {
      let formatter = NSDateFormatter()
      formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ssZZZZZ"
      formatter.locale = NSLocale(localeIdentifier: "en_US_POSIX")

      return formatter
    }()
  }

  public static func decodeJson(json : AnyObject) throws -> NSDate {
    guard let str = json as? String,
          let result = JsonGenDateFormatter.withTimeZone.dateFromString(str)
    else {
      throw JsonDecodeError.WrongType(rawValue: json, expectedType: "ISO 8601 formatted NSDate")
    }

    return result
  }

  public func encodeJson() -> String {
    return JsonGenDateFormatter.withTimeZone.stringFromDate(self)
  }
}

extension Optional {
  public static func decodeJson(decodeWrapped: AnyObject throws -> Wrapped, _ json: AnyObject) throws -> Wrapped? {
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

  public func encodeJson(encodeJsonWrapped: Wrapped -> AnyObject) -> AnyObject {
    return self.map(encodeJsonWrapped) ?? NSNull()
  }
}

extension Array {
  public static func decodeJson(decodeElement: AnyObject throws -> Element, _ json: AnyObject) throws -> [Element] {
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

  public func encodeJson(encodeJsonElement: Element -> AnyObject) -> [AnyObject] {
    return self.map(encodeJsonElement)
  }
}

extension Dictionary {
  public static func decodeJson(decodeKey: AnyObject throws -> Key, _ decodeValue: AnyObject throws -> Value, _ json: AnyObject) throws -> [Key: Value] {

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

  public func encodeJson(encodeJsonKey: Key -> String, _ encodeJsonValue: Value -> AnyObject) -> [String: AnyObject] {
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

  public var description: String {
    return multiline(Verbosity.Multiple).joinWithSeparator("\n")
  }

  public var fullDescription: String {
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
