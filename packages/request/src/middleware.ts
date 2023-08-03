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
   * 执行 `request()` 时触发，可自定义 `request()` 相关功能
   */
  setup?: (context: RequestBasicContext<TData, any[]>) => void
}

export interface RequestMiddlewareObject<TData = any> extends BasicMiddleware<TData> {
  /**
   * 执行 `executor()` 时触发
   */
  handler?: AwaitableFn<[ctx: RequestContext<TData, any[]>, next: PromiseFn<[], void>]>
}

export interface RequestMiddlewareFunction<TData = any> extends BasicMiddleware<TData> {
  /**
   * 执行 `executor()` 时触发
   */
  (context: RequestContext<TData, any[]>, next: PromiseFn<[], void>): void
}

export type RequestMiddleware<TData = any> =
  | RequestMiddlewareObject<TData>
  | RequestMiddlewareFunction<TData>

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
