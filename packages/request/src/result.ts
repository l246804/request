import type { Fn, Getter, PromiseFn } from '@rhao/types-base'
import type { RequestState } from './state'
import type { RequestBasicContext } from './context'

/**
 * "xxx.d.ts" or "xxx.ts"
 *
 * @example
 * ```ts
 * declare module '@rhao/request' {
 *   interface RequestResult<TData, TParams extends unknown[] = unknown[]> {
 *     custom?: {} // 自定义结果
 *   }
 * }
 * ```
 */
export interface RequestResult<TData, TParams extends unknown[] = unknown[]> {
  /**
   * 获取当前 `request()` 唯一标识
   */
  getKey: Getter<string>

  /**
   * 获取当前 `request()` 状态
   */
  getState: Getter<RequestState<TData, TParams>>

  /**
   * 获取当前 `request()` 上下文
   */
  getContext: Getter<RequestBasicContext<TData, TParams>>

  /**
   * 取消正在执行的请求
   */
  cancel: Fn

  /**
   * 手动执行请求
   */
  run: PromiseFn<TParams, TData>

  /**
   * 根据最后一次执行的 `params` 重新执行请求
   */
  refresh: PromiseFn<[], TData>
}
