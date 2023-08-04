export function createPendingHelper() {
  let count = 0
  const hasPending = () => count === 0

  const hooks = {
    before: () => ++count,
    end: () => --count,
  }

  return {
    hasPending,
    hooks,
  }
}
