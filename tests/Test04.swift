typealias MyBool = Bool
typealias MyOptionalBool = MyBool?
typealias MySecondOptionalBool = MyOptionalBool

struct Test04 {
  let one: Int
  let two: MyBool?
  let three: MySecondOptionalBool
  let four: [String?]
  let five: [Double]?
  let six: [Bool?]?
}
