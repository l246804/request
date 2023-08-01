export function createCounter() {
  let value = 0

  function getCurrent() {
    return value
  }

  function next() {
    return ++value
  }

  return { getCurrent, next }
}
