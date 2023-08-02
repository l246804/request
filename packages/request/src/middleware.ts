import type { AwaitableFn, PromiseFn } from 'types/utils'
import { isFunction, isNumber } from '@rhao/request-utils'
import type { RequestBasicContext, RequestContext } from './context'

interface BasicMiddleware<TData = any> {
  /**
   * 优先级，数值越小优先级越高，相同数值或未设置时根据先后顺序执行
   */
  priority?: number

  /**
   * 安装中间件时触发，可设置 `request()` 返回结果
   */
  setup?: (context: RequestBasicContext<TData, any[]>) => void
}

export interface RequestMiddlewareObject<TData = any> extends BasicMiddleware<TData> {
  /**
   * 中间件具体操作
   */
  handler?: AwaitableFn<[ctx: RequestContext<TData, any[]>, next: PromiseFn]>
}

export interface RequestMiddlewareFunction<TData = any> extends BasicMiddleware<TData> {
  /**
   * 中间件具体操作
   */
  (context: RequestContext<TData, any[]>, next: PromiseFn): void
}

export type RequestMiddleware = RequestMiddlewareObject | RequestMiddlewareFunction

/**
 * 统一化中间件
 */
export function normalizeMiddleware(middleware: RequestMiddleware[]) {
  const priorityMiddleware: RequestMiddleware[] = []
  const orderMiddleware: RequestMiddleware[] = []
  for (const mw of middleware) {
    if (!mw || priorityMiddleware.includes(mw) || orderMiddleware.includes(mw)) continue
    if (!isNumber(mw.priority) || Number.isNaN(mw.priority)) orderMiddleware.push(mw)
    else priorityMiddleware.push(mw)
  }
  const sortedMiddleware = priorityMiddleware
    .sort((a, b) => a.priority! - b.priority!)
    .concat(orderMiddleware)
  return sortedMiddleware.map((mw) => {
    if (isFunction(mw)) (mw as RequestMiddlewareObject).handler = mw.bind(mw)
    return mw as RequestMiddlewareObject
  })
}
