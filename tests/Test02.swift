import Foundation

typealias MyInt = Int

struct Test02 {
  let one: MyInt
  let two: String?
  let sub: Sub
}

struct Sub {
  let one: NSURL
  let two: NSDate

  static func decode(json: AnyObject) -> Sub? {
    return Sub(one: NSURL(), two: NSDate())
  }
}
