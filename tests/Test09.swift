struct Test09 {
  let one: Int
  let intSub1: Sub1<Int>
  let stringSub1: Sub1<String>
  let sub2: Sub2<Int, Bool>
  let sub3: Sub3<Int, Int, String>
}

struct Sub1<T> {
  let one: Bool
  let value: T
}

struct Sub2<A, B> {
  let a: A
  let b: B?
  let c: [[B?]?]?
}

struct Sub3<A, B, C> {
  let a1: A
  let a2: A
  let b: B?
  let c: [C]
  let sub2: Sub2<B, A>
}
