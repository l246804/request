/* eslint-disable unused-imports/no-unused-vars */
import type {
  BasicRequestHook,
  RequestBasicContext,
  RequestMiddleware,
  StoreKey,
} from '@rhao/request'
import { controllablePromise, safeJSONParse, toValue } from '@rhao/lodash-x'
import type { Fn, MaybeGetter } from '@rhao/types-base'
import { assign, noop, omit, pick } from 'lodash-unified'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface RequestSWROptions {
  /**
   * 保鲜时间，单位：ms，仅在初始值大于 0 时开启保鲜
   *
   * ***注意：不适用于参数易变更的场景***
   *
   * @default 0
   */
  staleTime?: MaybeGetter<number>
  /**
   * 保鲜时间内是否允许执行，如果设为 `true`，则在保鲜期内仍然执行请求
   * @default false
   */
  executeInStaleTime?: MaybeGetter<boolean>
  /**
   * 是否持久化，如果设为 `true`，则数据将持久化至 `storage` 中
   * @default false
   */
  persistent?: boolean
  /**
   * 存储中心，默认为 `localStorage`，可通过传入实现了 `StorageLike` 接口的对象更改存储目标
   * @default localStorage
   */
  storage?: StorageLike
  /**
   * 存储键前缀
   * @default '__REQUEST_SWR__'
   */
  storageKeyPrefix?: string
}

interface ICache {
  data?: any
  lastUpdateTime?: number
  promise: Promise<any> | null
  contexts: RequestBasicContext<any, any[]>[]
}

const swrs = new WeakMap<
  BasicRequestHook,
  { cache: Map<string, ICache> } & Pick<
    RequestSWROptions,
    'persistent' | 'storage' | 'storageKeyPrefix'
  >
>()

function isStaled(cache: ICache, staleTime: MaybeGetter<number>) {
  const staleTimeValue = toValue(staleTime)
  return (
    staleTimeValue > 0
    && cache.lastUpdateTime != null
    && Date.now() - cache.lastUpdateTime < staleTimeValue
  )
}

interface SWRStore {
  options: Required<RequestSWROptions>
  enabled: boolean
}

const storeKey: StoreKey<SWRStore> = Symbol('swr')

const isClient = typeof window !== 'undefined'
const storageLike = {
  getItem: noop,
  setItem: noop,
  removeItem: noop,
} as StorageLike
const defaultStorage = isClient ? localStorage : storageLike

const immutableKeys = ['persistent', 'storage', 'storageKeyPrefix'] as const

function sKey(prefix: string, key: string) {
  return prefix + key
}

export function RequestSWR(initialOptions?: Omit<RequestSWROptions, 'staleTime'>) {
  const middleware: RequestMiddleware = {
    name: 'Basic:RequestSWR',
    priority: 1000,
    setup: (ctx) => {
      const { hooks, request, getKey, getState, getOptions, mutateState } = ctx
      const key = getKey()

      const options = assign(
        {
          staleTime: 0,
          executeInStaleTime: false,
          persistent: false,
          storage: defaultStorage,
          storageKeyPrefix: '__REQUEST_SWR__',
        } as RequestSWROptions,
        omit(initialOptions, ['staleTime']),
        omit(getOptions().swr, immutableKeys),
      ) as Required<RequestSWROptions>
      const enabled = toValue(options.staleTime) > 0

      ctx.setStore(storeKey, { options, enabled })

      // 未开启时直接返回
      if (!enabled) return

      // 设置当前 request 的 swr 配置
      if (!swrs.has(request)) {
        swrs.set(request, {
          cache: new Map(),
          ...pick(options, immutableKeys),
        })
      }
      const cache = swrs.get(request)!.cache

      // 不存在当前缓存时则初始化
      if (!cache.has(key)) {
        cache.set(key, {
          promise: null,
          contexts: [],
        })
      }

      const currentCache = cache.get(key)!
      currentCache.contexts.push(ctx)

      // 持久化时从 storage 中读取缓存信息
      if (options.persistent) {
        const cacheData = safeJSONParse(
          options.storage.getItem(sKey(options.storageKeyPrefix, key))!,
          {
            data: null,
            lastUpdateTime: undefined,
          } as ICache,
        )

        // 如果还在保鲜期内则更新内存里的缓存信息，否则移除 storage 内的缓存信息
        if (isStaled(cacheData, options.staleTime!))
          assign(currentCache, cacheData)
        else
          options.storage.removeItem(sKey(options.storageKeyPrefix, key))
      }

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
          isStaled(currentCache, options.staleTime!)
          && !getOptions().dataComparer(currentCache.data, getState().data)
        )
          mutateState({ data: currentCache.data })
      })

      hooks.hookOnce('dispose', () => {
        const index = currentCache.contexts.indexOf(ctx)
        if (index > -1) currentCache.contexts.splice(index, 1)
        if (currentCache.contexts.length === 0) {
          cache.delete(key)
          // 持久化时删除 storage 中的缓存信息
          options.persistent && options.storage.removeItem(sKey(options.storageKeyPrefix, key))
        }
      })
    },
    handler: async (ctx, next) => {
      const { options, enabled } = ctx.getStore(storeKey)!
      // 没有启用时直接返回执行下一个中间件
      if (!enabled) return next()

      const cache = swrs.get(ctx.request)!.cache
      const currentCache = cache.get(ctx.getKey())!

      // 存在共享的 promise 时直接返回
      if (currentCache.promise != null) return currentCache.promise

      // 数据在保鲜期内且 executeInStaleTime 为 `false` 时则直接返回
      if (!toValue(options.executeInStaleTime) && isStaled(currentCache, options.staleTime!))
        return ctx.mutateData(currentCache.data)

      const { promise, resolve } = controllablePromise()
      currentCache.promise = promise

      ctx.hooks.hookOnce('finally', () => {
        const data = ctx.getState().data

        // 成功且未取消时更新数据
        if (!ctx.isFailed() && !ctx.isCanceled()) {
          currentCache.lastUpdateTime = Date.now()
          // 若数据一致则不同步
          if (!ctx.getOptions().dataComparer(data, currentCache.data)) {
            currentCache.data = data
            ctx.hooks.callHookParallel('swr:syncData', data)
          }

          // 持久化缓存至 storage 中
          if (options.persistent) {
            options.storage.setItem(
              sKey(options.storageKeyPrefix, ctx.getKey()),
              JSON.stringify(pick(currentCache, ['lastUpdateTime', 'data'])),
            )
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
  interface RequestOptions<TData, TParams extends unknown[] = unknown[]> {
    /**
     * `SWR` 配置
     */
    swr?: Omit<RequestSWROptions, (typeof immutableKeys)[number]>
  }

  interface RequestConfigHooks<TData, TParams extends unknown[] = unknown[]> {
    /**
     * `SWR` 同步数据时触发
     */
    'swr:syncData': Fn<[TData]>
  }
}
