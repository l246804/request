import type { Fn } from 'types/utils'
import type { RequestContext } from './context'

export function createLoadingController(onToggle: Fn<[boolean, RequestContext<any, any[]>]>) {
  let judgeValue = 0
  let count = 0

  function show(context: RequestContext<any, any[]>) {
    const prevCount = count++
    if (prevCount === judgeValue) onToggle?.(true, context)
  }

  function close(context: RequestContext<any, any[]>, force = false) {
    if (count === judgeValue) return
    // 手动触发 cancel 时会被调用两次，这里在强制刷新时不自减
    if (force) judgeValue = count
    else count--
    if (count === judgeValue) onToggle?.(false, context)
  }

  return { show, close }
}
