import type { PromiseFn } from 'types/utils'
import { isNumber } from '@rhao/request-utils'
import type { RequestBasicContext, RequestContext } from './context'

export interface RequestMiddleware<TData = any> {
  /**
   * 优先级，数值越小优先级越高，相同数值或未设置时根据先后顺序执行
   */
  priority?: number

  /**
   * 安装中间件时触发，可设置 `request()` 返回结果
   */
  setup?: (context: RequestBasicContext<TData, any[]>) => void

  /**
   * 中间件具体操作
   */
  (context: RequestContext<TData, any[]>, next: PromiseFn): void
}

/**
 * 中间件根据优先级排序
 */
export function sortMiddleware(middleware: RequestMiddleware[]) {
  const priorityMiddleware: RequestMiddleware[] = []
  const orderMiddleware: RequestMiddleware[] = []
  for (const mw of middleware) {
    if (!isNumber(mw.priority) || Number.isNaN(mw.priority)) orderMiddleware.push(mw)
    else priorityMiddleware.push(mw)
  }
  return priorityMiddleware.sort((a, b) => a.priority! - b.priority!).concat(orderMiddleware)
}
