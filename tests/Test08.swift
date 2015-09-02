struct Test08 {
  let one: Int
  let two: [String: Int]
  //  let three: [Bool: Float] // Can't encode non-string based keys in Json
  let four: [Enum08: Int]
  let five: JsonObject
}

typealias Test08String = String

enum Enum08: Test08String {
  case One = "One"
  case Two = "Two"
}
