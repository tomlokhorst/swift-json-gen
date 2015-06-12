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
    }
  }
}
