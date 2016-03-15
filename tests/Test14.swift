// Generate initializer: https://github.com/tomlokhorst/swift-json-gen/issues/20

struct Test14a {
  let one: Int
  let two: String?

  init(one: Int) {
    self.one = one
    self.two = nil
  }

  init(two: String) {
    self.one = 0
    self.two = two
  }

  init(two: String, one: Int) {
    self.one = one
    self.two = two
  }

  private init(one: Int, two: String) {
    self.one = one
    self.two = two
  }
}

struct Test14b {
  let one: Int
  let two: String?

  init(one: Int) {
    self.one = one
    self.two = nil
  }
}

extension Test14b {
  init(one: Int, two: String?) {
    self.one = one
    self.two = two
  }
}
