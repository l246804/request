/* eslint-disable @typescript-eslint/indent */
import type { Hookable } from 'hookable'
import type { Fn, Getter, PromiseFn } from 'types/utils'
import type { RequestHooks } from './hooks'
import type { RequestBasicOptions, RequestOptions } from './options'
import type { RequestResult } from './result'
import type { RequestFetcher } from './fetcher'
import type { RequestState } from './state'
import type { BasicRequest } from '.'

interface MutateState<S extends RequestState<any, any[]>> {
  (state: Partial<S>): void
  <K extends keyof S>(key: K, value: S[K]): void
}

interface MutateResult<TData, TParams extends unknown[]> {
  (callback: Fn<[RequestResult<TData, TParams>], RequestResult<TData, TParams>>): void
}

export interface RequestCustomContext {}

export interface RequestBasicContext<TData, TParams extends unknown[] = unknown[]> {
  /**
   * `request()`
   */
  request: BasicRequest

  /**
   * `hooks` 管理器
   */
  hooks: Hookable<RequestHooks>

  /**
   * 获取或设置 `fetcher`
   */
  fetcher: RequestFetcher<TData, TParams>

  /**
   * 获取执行器
   */
  executor: PromiseFn<TParams>

  /**
   * 获取唯一标识
   */
  getKey: Getter<string>

  /**
   * 获取 `request()` 的配置项
   */
  getOptions: Getter<RequestOptions<TData, TParams> & Required<RequestBasicOptions>>

  /**
   * 获取 `request()` 的状态
   */
  getState: Getter<RequestState<TData, TParams>>

  /**
   * 修改 `request()` 的状态
   */
  mutateState: MutateState<RequestState<TData, TParams>>

  /**
   * 修改 `request()` 结果
   */
  mutateResult: MutateResult<TData, TParams>
}

export interface RequestContext<TData, TParams extends unknown[] = unknown[]>
  extends RequestCustomContext,
    Omit<RequestBasicContext<TData, TParams>, 'mutateResult'> {
  /**
   * 是否已取消执行
   */
  isCanceled: Getter<boolean>

  /**
   * 取消执行
   * @param silent 不触发 `cancel` 事件，默认：false
   */
  cancel: Fn<[boolean?]>
}
