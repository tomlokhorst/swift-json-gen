// Struct in extension: https://github.com/tomlokhorst/swift-json-gen/issues/22

struct Test13 {
  let title: String
//  let two: Test13.Test13b
}

extension Test13 {
  struct Test13b {
    let title: String
  }
}
