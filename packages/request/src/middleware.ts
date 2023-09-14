import type { AwaitableFn, PromiseFn } from '@rhao/types-base'
import { isFunction, isNumber } from 'lodash-unified'
import type { RequestBasicContext, RequestContext } from './context'

interface BasicMiddleware<TData = any> {
  /**
   * 插件名称，可标识唯一中间件
   */
  name?: string

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

const noopMiddleware: RequestMiddlewareFunction = (_, next) => next()

/**
 * 统一化中间件
 */
export function normalizeMiddleware(middleware: RequestMiddleware[]) {
  const normalizedMiddleware: RequestMiddlewareObject[] = []

  for (const mw of middleware) {
    if (!mw || normalizedMiddleware.includes(mw)) continue

    // 创建对象类型中间件
    const mwo: RequestMiddlewareObject = mw

    // 如果中间件没有设置优先级，则默认为 1
    if (!isNumber(mwo.priority) || Number.isNaN(+mwo.priority)) mwo.priority = 1

    // 如果中间件是函数类型，则将其挂载至自身的 handler 转成对象类型
    if (isFunction(mwo)) mwo.handler = mwo.bind(mw)

    // 如果没有设置 handler，则填充空中间件用于执行
    if (!mwo.handler) mwo.handler = noopMiddleware

    // 追加至结果数组中
    normalizedMiddleware.push(mwo)
  }

  // 根据优先级排序
  return normalizedMiddleware.sort((a, b) => b.priority! - a.priority!)
}
