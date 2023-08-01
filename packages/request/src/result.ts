import type { Fn, Getter, PromiseFn } from 'types/utils'
import type { RequestState } from './state'

// eslint-disable-next-line unused-imports/no-unused-vars
export interface RequestCustomResult<TData, TParams extends unknown[] = unknown[]> {}

export interface RequestResult<TData, TParams extends unknown[] = unknown[]>
  extends RequestCustomResult<TData, TParams> {
  /**
   * 获取当前 `request()` 唯一标识
   */
  getKey: Getter<string>

  /**
   * 获取当前 `request()` 状态
   */
  getState: Getter<RequestState<TData, TParams>>

  /**
   * 取消正在执行的请求
   */
  cancel: Fn

  /**
   * 手动执行请求
   */
  run: PromiseFn<TParams, TData>

  /**
   * 根据最后一次 `params` 刷新执行请求
   */
  refresh: PromiseFn<[], TData>
}
