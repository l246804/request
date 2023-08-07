/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable @typescript-eslint/indent */
import type { NestedHooks } from 'hookable'
import type { AwaitableFn, Getter, MaybeArray, MaybeFn, MaybeGetter } from 'types/utils'
import { assign } from '@rhao/request-utils'
import type { RequestHooks } from './hooks'
import type { RequestMiddleware } from './middleware'
import type { BasicRequest } from '.'

/**
 * "xxx.d.ts" or "xxx.ts"
 *
 * @example
 * ```ts
 * declare module '@rhao/request' {
 *   interface RequestCustomOptions<TData, TParams extends unknown[] = unknown[]> {
 *     custom?: {} // 自定义配置项
 *   }
 * }
 * ```
 */
export interface RequestCustomOptions<TData, TParams extends unknown[] = unknown[]> {}

export interface RequestBasicOptions {
  /**
   * 唯一标识生成器
   */
  keyGenerator?: Getter<string>

  /**
   * 是否手动执行
   * - `true`: 手动调用 `run` 执行
   * - `false`: 创建后自动执行
   * @default false
   */
  manual?: boolean

  /**
   * `loading` 延迟时间，单位：`ms`，如果值大于 0，则启动延迟，若请求在延迟前结束则不会更新 `loading` 状态
   * @default 300
   */
  loadingDelay?: number

  /**
   * 执行时是否保留 `data`，默认不保留
   * @default true
   */
  keepPreviousData?: MaybeGetter<boolean>

  /**
   * 单例模式，如果设为 `true`，则存在未完成的执行时不会再执行
   * @default false
   */
  single?: MaybeFn<boolean, [newParams: unknown[], oldParams: unknown[]]>

  /**
   * 强制单例模式，如果设为 `true`，在执行前将取消之前的所有执行，不论其是否成功
   *
   * @default false
   */
  singleWithForce?: MaybeGetter<boolean>

  /**
   * 数据对比，在执行流时对比数据是否一致，不一致时同步数据且触发 `stateChange`
   * @default
   * ```ts
   * previousData === currentData
   * ```
   */
  dataCompare?: AwaitableFn<[previousData: unknown, currentData: unknown]>

  /**
   * 执行失败时是否初始化数据
   * @default true
   */
  initDataWhenError?: MaybeGetter<boolean>

  /**
   * 中间件
   */
  middleware?: RequestMiddleware<any>[]

  /**
   * `hooks` 配置
   */
  hooks?: NestedHooks<RequestHooks>[]

  /**
   * 执行 `dispose()` 时是否调用 `cancel()`
   *
   * @default true
   */
  cancelWhenDispose?: MaybeGetter<boolean>

  /**
   * 数据解析器，执行 `fetcher()` 后直接进行数据解析
   * @description 需要返回正确类型的数据或直接抛出错误消息，可用于适配已有固定格式的 `fetcher`
   * @example
   * ```ts
   * // eg1:
   * const { getState } = request(() => axios.get('/api/example'), {
   *   dataParser: (response) => response.data
   * })
   * getState().data // => response.data
   *
   * // eg2:
   * // 返回格式：{ data: any; error: boolean; message?: string }
   * const fetcher = () => axios.get('/api/example').then((response) => response.data) }
   * const { getState } = request(fetcher, {
   *   dataParser: (data) => {
   *     if (data.error) throw new Error(data.message)
   *     return data.data
   *   }
   * })
   * getState().data // => response.data.data
   * getState().error // => Error: response.data.message
   * ```
   */
  dataParser?: AwaitableFn<[data: any], unknown>
}

export interface RequestOptions<TData, TParams extends unknown[] = unknown[]>
  extends RequestCustomOptions<TData, TParams>,
    Omit<RequestBasicOptions, 'hooks'> {
  /**
   * 唯一标识
   */
  key?: string

  /**
   * 初始化数据
   * @example
   * ```ts
   * const { getState } = request(() => Promise.resolve(1), { manual: true })
   * getState().data // => undefined
   *
   * const { getState } = request(() => Promise.resolve(1), { initData: () => [] })
   * getState().data // => []
   * ```
   */
  initData?: Getter<TData>

  /**
   * 默认执行参数，仅在创建时第一次自动执行有效
   */
  defaultParams?: TParams

  /**
   * 执行是否就绪
   * @default true
   */
  ready?: MaybeFn<boolean, [TParams]>

  /**
   * `hooks` 配置
   */
  hooks?: MaybeArray<NestedHooks<RequestHooks<TData, TParams>>>
}

export function normalizeBasicOptions(request: BasicRequest, options?: RequestBasicOptions) {
  return assign(
    {
      keyGenerator: () => `__request__${request.counter.next()}`,
      dataParser: (data) => data,
      dataCompare: (d1, d2) => d1 === d2,
      cancelWhenDispose: true,
      keepPreviousData: true,
      single: false,
      singleWithForce: false,
      initDataWhenError: true,
      manual: false,
      loadingDelay: 300,
      hooks: [],
      middleware: [],
    } as RequestBasicOptions,
    options,
  ) as Required<RequestBasicOptions>
}

export function normalizeOptions(request: BasicRequest, options?: RequestOptions<any, any[]>) {
  return assign({ ready: true } as RequestOptions<any, any[]>, request.options, options)
}
