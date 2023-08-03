export function createCounter() {
  let value = 0

  function current() {
    return value
  }

  function next() {
    return ++value
  }

  return { current, next }
}
