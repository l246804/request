import type { AwaitableFn, PromiseFn } from 'types/utils'
import { isFunction, isNumber } from '@rhao/request-utils'
import type { RequestBasicContext, RequestContext } from './context'

interface BasicMiddleware<TData = any> {
  /**
   * 优先级，数值越大越先执行，相同数值时根据先后顺序执行
   * @default 1
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
  const normalizedMiddleware: RequestMiddlewareObject[] = []
  for (const mw of middleware) {
    if (!mw || normalizedMiddleware.includes(mw)) continue
    if (!isNumber(mw.priority) || Number.isNaN(mw.priority)) mw.priority = 1
    if (isFunction(mw)) (mw as RequestMiddlewareObject).handler = mw.bind(mw)
    normalizedMiddleware.push(mw)
  }
  return normalizedMiddleware.sort((a, b) => b.priority! - a.priority!)
}
