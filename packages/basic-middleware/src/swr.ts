/* eslint-disable unused-imports/no-unused-vars */
import {
  MiddlewareHelper,
  type MiddlewareStoreKey,
  type RequestBasicContext,
  type RequestMiddleware,
} from '@rhao/request'
import { pauseablePromise, toValue } from '@rhao/request-utils'
import type { Fn, MaybeGetter } from 'types/utils'

export interface RequestSWROptions {
  staleTime?: MaybeGetter<number>
}

interface SWRStore {
  initialed: boolean
  cached: Map<
    string,
    {
      data?: any
      lastUpdateTime?: number
      promise: Promise<any> | null
      contexts: RequestBasicContext<any, any[]>[]
    }
  >
}

const storeKey: MiddlewareStoreKey<SWRStore> = Symbol('swr')
const {
  setCtx: setStoreCtx,
  init: initStore,
  get: getStore,
} = MiddlewareHelper.createStore(storeKey)

function init() {
  if (getStore()?.initialed) return getStore()!
  return initStore({
    initialed: true,
    cached: new Map(),
  })
}

export function RequestSWR() {
  const middleware: RequestMiddleware = {
    priority: 1000,
    setup: (ctx) => {
      setStoreCtx(ctx)

      const { cached } = init()
      const { hooks, getKey, mutateState } = ctx
      const key = getKey()

      if (!cached.has(key)) {
        cached.set(key, {
          promise: null,
          contexts: [],
        })
      }

      const currentCached = cached.get(key)!
      currentCached.contexts.push(ctx)

      // 初始化设置缓存数据
      if (currentCached.lastUpdateTime != null) mutateState({ data: currentCached.data })

      hooks.hook('swr:syncData', (data) => {
        currentCached.contexts.forEach((_ctx) => {
          if (_ctx !== ctx) _ctx.mutateState({ data })
        })
      })

      hooks.hookOnce('dispose', () => {
        const index = currentCached.contexts.indexOf(ctx)
        if (index > -1) currentCached.contexts.splice(index, 1)
        if (currentCached.contexts.length === 0) cached.delete(key)
      })
    },
    handler: async (ctx, next) => {
      const { cached } = getStore()!
      const currentCached = cached.get(ctx.getKey())!

      if (currentCached.promise != null) return currentCached.promise

      const now = Date.now()
      const lastUpdateTime = currentCached.lastUpdateTime || now
      const staleTime = toValue(ctx.getOptions().swr?.staleTime || 0)
      if (now - lastUpdateTime < staleTime) return ctx.mutateData(currentCached.data)

      const { promise, resolve } = pauseablePromise()
      currentCached.promise = promise

      await next()

      ctx.hooks.hookOnce('finally', () => {
        const data = ctx.getState().data
        currentCached.lastUpdateTime = Date.now()
        currentCached.data = data
        currentCached.promise = null
        resolve(data)
        ctx.hooks.callHookParallel('swr:syncData', data)
      })
    },
  }

  return middleware
}

declare module '@rhao/request' {
  interface RequestCustomOptions<TData, TParams extends unknown[] = unknown[]> {
    swr?: RequestSWROptions
  }

  interface RequestCustomHooks<TData, TParams extends unknown[] = unknown[]> {
    'swr:syncData': Fn<[TData]>
  }
}
