export function createKeyManager() {
  let count = 0

  function toKey(num: number) {
    return `__${num}`
  }

  function getNextKey() {
    return toKey(count++)
  }

  function getCurrentKey() {
    return toKey(count)
  }

  return {
    toKey,
    getNextKey,
    getCurrentKey,
  }
}
