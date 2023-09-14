import type { NestedHooks } from 'hookable'
import type { AwaitableFn, Fn, Getter, MaybeArray, MaybeGetter } from '@rhao/types-base'
import { assign } from 'lodash-unified'
import type { RequestConfigHooks } from './hooks'
import type { RequestMiddleware } from './middleware'

/**
 * "xxx.d.ts" or "xxx.ts"
 *
 * @example
 * ```ts
 * declare module '@rhao/request' {
 *   interface RequestBasicOptions<TData, TParams extends unknown[] = unknown[]> {
 *     custom?: {} // 自定义基础配置项
 *   }
 * }
 * ```
 */
export interface RequestBasicOptions {
  /**
   * 唯一标识生成器
   */
  keyGenerator?: Getter<string>

  /**
   * 执行时是否保留旧 `data`
   * @default true
   */
  keepPreviousData?: MaybeGetter<boolean>

  /**
   * 中间件
   */
  middleware?: RequestMiddleware<any>[]

  /**
   * 配置 `hooks` 事件
   */
  hooks?: NestedHooks<RequestConfigHooks>[]

  /**
   * 执行 `dispose()` 时是否调用 `cancel()`
   *
   * @default true
   */
  cancelWhenDispose?: MaybeGetter<boolean>

  /**
   * 数据对比器，在执行流时对比数据是否一致，不一致时同步数据且触发 `stateChange`
   * @default
   * ```ts
   * previousData === currentData
   * ```
   */
  dataComparer?: Fn<[previousData: unknown, currentData: unknown], boolean>

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

/**
 * "xxx.d.ts" or "xxx.ts"
 *
 * @example
 * ```ts
 * declare module '@rhao/request' {
 *   interface RequestOptions<TData, TParams extends unknown[] = unknown[]> {
 *     custom?: {} // 自定义配置项
 *   }
 * }
 * ```
 */
export interface RequestOptions<TData, TParams extends unknown[] = unknown[]>
  extends Omit<RequestBasicOptions, 'hooks'> {
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
   * 数据校准器，调用 `dataParser` 后对获取到的数据进行校准，返回正确完整的类型数据
   *
   * @example
   * ```ts
   * function fetchList() {
   *   // 返回数据与格式不符合，需对数据进行校准
   *   return [{ id: '1', name: null }] as { id: number; name: string }[]
   * }
   *
   * useRequest(fetchList, {
   *   dataCalibrator: (data) => {
   *     // 校准数据
   *     return data.map((item) => ({ id: parseInt(item.id), name: item.name || '-' }))
   *   }
   * })
   * ```
   */
  dataCalibrator?: Fn<[data: TData], TData>

  /**
   * 忽略执行的中间件列表，需对应中间件包含 `name`，支持字符串和正则表达式匹配
   *
   * @example
   * ```ts
   * const useRequest = createRequestHook({
   *   middleware: [
   *     {
   *       name: 'RequestTest',
   *       setup: (ctx) => {
   *         console.log('test setup')
   *         ctx.mutateResult({ isTest: () => true })
   *       },
   *       handler: (_, next) => {
   *         console.log('test handler')
   *         return next()
   *       },
   *     }
   *   ]
   * })
   *
   * // 正常执行
   * const { run, isTest } = useRequest(() => Promise.resolve(true), { immediate: false })
   * isTest()
   * // => true
   *
   * run().finally(() => console.log(1))
   * // => 1. test setup
   * // => 2. test handler
   * // => 3. 1
   *
   * // 忽略 RequestTest 中间件
   * const result = useRequest(() => Promise.resolve(true), {
   *   immediate: false,
   *   // 跳过 RequestTest 执行
   *   ignoreMiddleware: ['RequestTest'],
   * })
   * result.isTest // 忽略中间件后该方法将不被安装，输出 undefined
   *
   * result.run().finally(() => console.log(1))
   * // => 1
   * ```
   */
  ignoreMiddleware?: (RegExp | string)[]

  /**
   * `hooks` 配置
   */
  hooks?: MaybeArray<NestedHooks<RequestConfigHooks<TData, TParams>>>
}

export function normalizeBasicOptions(options?: RequestBasicOptions) {
  return assign(
    {
      keyGenerator: () => '',
      dataParser: (data) => data,
      dataComparer: (d1, d2) => d1 === d2,
      cancelWhenDispose: true,
      keepPreviousData: true,
      hooks: [],
      middleware: [],
    } as RequestBasicOptions,
    options,
  ) as Required<RequestBasicOptions>
}
