/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable unused-imports/no-unused-vars */
import type { Recordable } from 'types/utils'
import { assign } from '@rhao/request-utils'
import type { RequestBasicContext } from '.'

export interface MiddlewareStoreKey<T> extends Symbol {}

export type InferMiddlewareStore<K extends MiddlewareStoreKey<any>> = K extends MiddlewareStoreKey<
  infer T
>
  ? T
  : Recordable

export const MiddlewareHelper = {
  createStore: <K extends MiddlewareStoreKey<any>>(key: K) => {
    let ctx
    return {
      setCtx(context: RequestBasicContext<any, any[]>) {
        if (!context || !context.request)
          throw new Error('setCtx() must be called with a RequestContext')
        ctx = context
      },
      init: (defaultStore?: InferMiddlewareStore<K>) => {
        if (!ctx || !ctx.request) throw new Error('init() must be called with a RequestContext')
        return (ctx.request[key] = assign({}, defaultStore))
      },
      get: (): InferMiddlewareStore<K> | null => {
        return ctx.request[key] ?? null
      },
    }
  },
}
