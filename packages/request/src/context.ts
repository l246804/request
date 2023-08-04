/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable @typescript-eslint/indent */
import type { AwaitableFn, Fn, Getter, PromiseFn } from 'types/utils'
import { assign, isString, keysOf } from '@rhao/request-utils'
import type { RequestHookable } from './hooks'
import type { RequestBasicOptions, RequestOptions } from './options'
import type { RequestResult } from './result'
import type { RequestFetcher } from './fetcher'
import type { RequestState } from './state'
import type { BasicRequest } from '.'

interface MutateState<
  TData,
  TParams extends unknown[] = unknown[],
  S extends RequestState<any, any[]> = RequestState<TData, TParams>,
> {
  (state: Partial<S>): void
  <K extends keyof S>(key: K, value: S[K]): void
}

interface MutateResult<TData, TParams extends unknown[]> {
  (result: Partial<RequestResult<TData, TParams>>): void
}

/**
 * "xxx.d.ts" or "xxx.ts"
 *
 * @example
 * ```ts
 * declare module '@rhao/request' {
 *   interface RequestCustomContext<TData, TParams extends unknown[] = unknown[]> {
 *     custom: {} // 自定义上下文
 *   }
 * }
 * ```
 */
export interface RequestCustomContext<TData, TParams extends unknown[] = unknown[]> {}

export interface RequestBasicContext<TData, TParams extends unknown[] = unknown[]> {
  /**
   * `request()`
   */
  request: BasicRequest

  /**
   * `hooks` 管理器
   */
  hooks: RequestHookable

  /**
   * 获取或设置 `fetcher`
   */
  fetcher: RequestFetcher<TData, TParams>

  /**
   * 获取或设置 `executor`
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
   * 获取 `request()` 的结果
   */
  getResult: Getter<RequestResult<TData, TParams>>

  /**
   * 修改 `request()` 的状态，执行流时推荐使用 `mutateData` 修改 `data` 属性，避免频繁更新
   */
  mutateState: MutateState<TData, TParams>

  /**
   * 修改 `request()` 结果
   */
  mutateResult: MutateResult<TData, TParams>

  /**
   * 是否存在未完成的执行，用于判断多次并发是否全部完成
   */
  hasPending: Getter<boolean>

  /**
   * 主动释放资源，当不再使用某个 `request()` 时可调用该函数触发 `hook:dispose`
   *
   * ***谨慎调用***
   */
  dispose: Fn<[]>
}

export interface RequestContext<TData, TParams extends unknown[] = unknown[]>
  extends RequestCustomContext<TData, TParams>,
    Omit<RequestBasicContext<TData, TParams>, 'mutateResult' | 'dispose'> {
  /**
   * 修改 `state.data`
   *
   * ***注意：不会直接触发 `stateChange`，在 `hook:end` 时会通过 `dataCompare` 对比前后数据，不一致时触发 `stateChange`，避免频繁更新***
   */
  mutateData: AwaitableFn<[data: TData]>

  /**
   * 是否是最后一次执行
   */
  isLatestExecution: Getter<boolean>

  /**
   * 是否已取消执行
   */
  isCanceled: Getter<boolean>

  /**
   * 取消执行
   * @param silent 不触发 `cancel` 事件
   * @default false
   */
  cancel: Fn<[silent?: boolean]>
}

export function createMutateState(
  state: RequestState<any, any[]>,
  context: Getter<RequestBasicContext<any, any[]>>,
): MutateState<any, any[]> {
  return (keyOrState, value?) => {
    let mutatedValue = keyOrState

    if (isString(keyOrState)) {
      if (!keysOf(state).includes(keyOrState))
        return console.warn(`mutateState(): ${keyOrState} is not exist.`)
      mutatedValue = { [keyOrState]: value }
    }

    assign(state, mutatedValue)
    context().hooks.callHookSync('stateChange', mutatedValue, context())
  }
}