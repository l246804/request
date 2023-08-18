/* eslint-disable unused-imports/no-unused-vars */
import type { RequestBasicContext, RequestMiddleware, StoreKey } from '@rhao/request'
import { assign, pauseablePromise, toValue } from '@rhao/request-utils'
import type { Fn, MaybeGetter } from '@rhao/request-types'
import { once } from 'lodash-unified'

export interface RequestSWROptions {
  /**
   * 保鲜时间，单位：ms
   * @default 0
   */
  staleTime?: MaybeGetter<number>
  /**
   * 保险时间内是否允许执行，如果设为 `true`，则在保鲜期内仍然执行请求
   * @default false
   */
  executeInStaleTime?: MaybeGetter<boolean>
}

interface ICache {
  data?: any
  lastUpdateTime?: number
  promise: Promise<any> | null
  contexts: RequestBasicContext<any, any[]>[]
}

let cached: Map<string, ICache>
const init = once(() => {
  cached = new Map()
})

function isStaled(cache: ICache, staleTime: MaybeGetter<number>) {
  const staleTimeValue = toValue(staleTime)
  return (
    staleTimeValue > 0 &&
    cache.lastUpdateTime != null &&
    Date.now() - cache.lastUpdateTime < staleTimeValue
  )
}

interface SWRStore {
  options: RequestSWROptions
}

const storeKey: StoreKey<SWRStore> = Symbol('swr')

export function RequestSWR(initialOptions?: RequestSWROptions) {
  init()

  const middleware: RequestMiddleware = {
    priority: 1000,
    setup: (ctx) => {
      const { hooks, getKey, getState, getOptions, mutateState } = ctx
      const key = getKey()

      ctx.setStore(storeKey, {
        options: assign(
          {
            staleTime: 0,
            executeInStaleTime: false,
          } as RequestSWROptions,
          initialOptions,
          getOptions().swr,
        ),
      })

      // 不存在当前缓存时则初始化
      if (!cached.has(key)) {
        cached.set(key, {
          promise: null,
          contexts: [],
        })
      }

      const currentCache = cached.get(key)!
      currentCache.contexts.push(ctx)

      // 初始化设置缓存数据
      if (currentCache.lastUpdateTime != null) mutateState({ data: currentCache.data })

      // 注册同步数据事件
      hooks.hook('swr:syncData', (data) => {
        currentCache.contexts.forEach((_ctx) => {
          if (_ctx !== ctx) _ctx.mutateState({ data })
        })
      })

      hooks.hook('before', () => {
        const { options } = ctx.getStore(storeKey)
        // 在保鲜期内且数据不一致时更新数据
        if (
          isStaled(currentCache, options.staleTime!) &&
          !getOptions().dataCompare(currentCache.data, getState().data)
        )
          mutateState({ data: currentCache.data })
      })

      hooks.hookOnce('dispose', () => {
        const index = currentCache.contexts.indexOf(ctx)
        if (index > -1) currentCache.contexts.splice(index, 1)
        if (currentCache.contexts.length === 0) cached.delete(key)
      })
    },
    handler: async (ctx, next) => {
      const currentCache = cached.get(ctx.getKey())!

      // 存在共享的 promise 时直接返回
      if (currentCache.promise != null) return currentCache.promise

      // 数据在保鲜期内且 executeInStaleTime 未 `false` 时则直接返回
      const options = ctx.getStore(storeKey)!.options
      if (!toValue(options.executeInStaleTime) && isStaled(currentCache, options.staleTime!))
        return ctx.mutateData(currentCache.data)

      const { promise, resolve } = pauseablePromise()
      currentCache.promise = promise

      ctx.hooks.hookOnce('finally', () => {
        const data = ctx.getState().data

        // 成功且未取消时更新数据
        if (!ctx.isFailed() && !ctx.isCanceled()) {
          currentCache.lastUpdateTime = Date.now()
          // 若数据一致则不同步
          if (!ctx.getOptions().dataCompare(data, currentCache.data)) {
            currentCache.data = data
            ctx.hooks.callHookParallel('swr:syncData', data)
          }
        }

        currentCache.promise = null
        resolve(undefined)
      })

      return next()
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
