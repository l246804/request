import type { Fn } from 'types/utils'

export function createLoadingController(onToggle: Fn<[boolean]>) {
  let judgeValue = 0
  let count = 0

  function show() {
    const prevCount = count++
    if (prevCount === judgeValue) onToggle?.(true)
  }

  function close(force = false) {
    if (count === judgeValue) return
    // 手动触发 cancel 时会被调用两次，这里在强制刷新时不自减
    if (force) judgeValue = count
    else count--
    if (count === judgeValue) onToggle?.(false)
  }

  return { show, close }
}
