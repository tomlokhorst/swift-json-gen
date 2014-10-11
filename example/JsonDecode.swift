//
//  JsonDecode.swift
//
//  Decoders for some base Swift and Foundation types.
//

import Foundation

extension String {
  static func decode(json : AnyObject) -> String? {
    return json as? String
  }
}

extension Bool {
  static func decode(json : AnyObject) -> Bool? {
    return json as? Bool
  }
}

extension Int {
  static func decode(json : AnyObject) -> Int? {
    return json as? Int
  }
}

extension NSURL {
  class func decode(json : AnyObject) -> NSURL? {
    if let url = String.decode(json) {
      return NSURL(string: url)
    }

    return nil
  }
}

