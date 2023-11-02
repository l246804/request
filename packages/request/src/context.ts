import type { AwaitableFn, Fn, Getter, NoopFn, PromiseFn, Recordable } from '@rhao/types-base'
import { assign, isString, keys } from 'lodash-unified'
import type { RequestHookable } from './hooks'
import type { RequestBasicOptions, RequestOptions } from './options'
import type { RequestResult } from './result'
import type { RequestFetcher } from './fetcher'
import type { RequestState } from './state'
import type { BasicRequestHook } from './core'
import type { InferStore, StoreKey } from './store'

interface MutateOptions<TData, TParams extends unknown[]> {
  (options: Partial<RequestOptions<TData, TParams> & Recordable<any>>): void
}

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
 *   interface RequestBasicContext<TData, TParams extends unknown[] = unknown[]> {
 *     custom: {} // 自定义基础上下文
 *   }
 * }
 * ```
 */
export interface RequestBasicContext<TData, TParams extends unknown[] = unknown[]> {
  /**
   * `request()`
   */
  request: BasicRequestHook

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
  executor: PromiseFn<TParams, any>

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
   * 修改 `request()` 配置项，仅支持浅合并
   *
   * ***注意：对于请求流来说该函数会产生副作用，需谨慎调用，必要时需手动还原！***
   */
  mutateOptions: MutateOptions<TData, TParams>

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
   * 清除未完成的执行记录
   */
  clearPending: NoopFn

  /**
   * 取消未完成的执行并立即清除执行记录
   */
  clearPendingWithCancel: NoopFn

  /**
   * 是否已释放资源
   */
  isDisposed: Getter<boolean>

  /**
   * 主动释放资源，当不再使用某个 `request()` 时可调用该函数触发 `hook:dispose`
   *
   * ***谨慎调用***
   */
  dispose: Fn<[]>

  /**
   * 设置数据中心，仅存在于单次 `request()` 周期内
   */
  setStore: <K extends StoreKey<Recordable>>(key: K, value: InferStore<K>) => InferStore<K>

  /**
   * 获取数据中心，仅获取存在于单次 `request()` 周期内
   */
  getStore: <K extends StoreKey<Recordable>>(key: K) => InferStore<K>
}

/**
 * "xxx.d.ts" or "xxx.ts"
 *
 * @example
 * ```ts
 * declare module '@rhao/request' {
 *   interface RequestContext<TData, TParams extends unknown[] = unknown[]> {
 *     custom: {} // 自定义上下文
 *   }
 * }
 * ```
 */
export interface RequestContext<TData, TParams extends unknown[] = unknown[]>
  extends Omit<RequestBasicContext<TData, TParams>, 'mutateResult' | 'dispose'> {
  /**
   * 修改 `state.data`
   *
   * ***注意：不会直接触发 `stateChange`，在 `hook:finally` 时会通过 `dataComparer` 对比前后数据，不一致时触发 `hook:stateChange`，避免频繁更新***
   */
  mutateData: AwaitableFn<[data: TData]>

  /**
   * 是否是最后一次执行
   */
  isLatestExecution: Getter<boolean>

  /**
   * 是否执行失败
   */
  isFailed: Getter<boolean>

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
      if (!keys(state).includes(keyOrState))
        return console.warn(`mutateState(): ${keyOrState} is not exist.`)
      mutatedValue = { [keyOrState]: value }
    }

    assign(state, mutatedValue)
    context().hooks.callHookSync('stateChange', mutatedValue, context())
  }
}
