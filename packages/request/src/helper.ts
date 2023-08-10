/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable unused-imports/no-unused-vars */
import type { Recordable } from '@rhao/request-types'
import { assign, isClient } from '@rhao/request-utils'
import type { RequestBasicContext, RequestContext } from '.'

export interface MiddlewareStoreKey<T> extends Symbol {}

export type InferMiddlewareStore<K extends MiddlewareStoreKey<any>> = K extends MiddlewareStoreKey<
  infer T
>
  ? T
  : Recordable

export const MiddlewareHelper = {
  /**
   * 创建全局数据中心，若已存在则返回存在的数据中心
   */
  createGlobalStore: <K extends MiddlewareStoreKey<any>>(key: K) => {
    const g = isClient() ? (window as any) : {}

    return {
      init: (defaultStore?: InferMiddlewareStore<K>) => {
        return (g[key] ||= assign({}, defaultStore))
      },
      get: (): InferMiddlewareStore<K> | null => {
        return g[key] ?? null
      },
      remove: () => {
        delete g[key]
      },
    }
  },

  /**
   * 创建数据中心，仅存在于单次 `request()` 周期内
   */
  initStore: <K extends MiddlewareStoreKey<any>>(
    key: K,
    context: RequestBasicContext<any, any[]> | RequestContext<any, any[]>,
    defaultStore?: InferMiddlewareStore<K>,
  ) => {
    if (!context) throw new Error('setCtx() must be called with a RequestContext')

    // @ts-expect-error
    return (context[key] = assign({}, defaultStore))
  },

  /**
   * 获取数据中心，仅获取存在于单次 `request()` 周期内
   */
  getStore<K extends MiddlewareStoreKey<any>, V>(
    key: K,
    context: RequestBasicContext<any, any[]> | RequestContext<any, any[]>,
  ): InferMiddlewareStore<K> | null {
    // @ts-expect-error
    return context[key] ?? null
  },
}
