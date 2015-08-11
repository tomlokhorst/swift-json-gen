struct Test08 {
  let one: Int
  let two: [String: Int]
  //  let three: [Bool: Float] // Can't encode non-string based keys in Json
  let four: [Enum08: Int]
}

enum Enum08: String {
  case One = "One"
  case Two = "Two"
}
