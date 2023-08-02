/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable @typescript-eslint/indent */
import type { NestedHooks } from 'hookable'
import type { Getter, MaybeArray, MaybeFn, MaybeGetter } from 'types/utils'
import type { RequestHooks } from './hooks'
import type { RequestMiddleware } from './middleware'

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
   * @default 0
   */
  loadingDelay?: number

  /**
   * 执行失败时是否初始化数据
   * @default false
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
