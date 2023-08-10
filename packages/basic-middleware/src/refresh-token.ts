/* eslint-disable unused-imports/no-unused-vars */
import { MiddlewareHelper } from '@rhao/request'
import type { MiddlewareStoreKey, RequestContext, RequestMiddleware } from '@rhao/request'
import { assign, ensureError, pick, toValue } from '@rhao/request-utils'
import type { AwaitableFn, PromiseFn } from '@rhao/request-types'

export interface RequestRefreshTokenOptions {
  /**
   * 本次过期是否允许刷新令牌
   * @default
   * ```ts
   * () => true
   * ```
   */
  allow?: AwaitableFn<[key: string, context: RequestContext<any, any[]>], boolean>
  /**
   * 验证刷新令牌是否过期
   */
  expired: AwaitableFn<[error: Error], boolean>
  /**
   * 允许刷新令牌时的具体刷新操作
   */
  handler: PromiseFn<[context: RequestContext<any, any[]>], void>
}

interface RefreshTokenGlobalStore {
  initialed: boolean
  refreshPromise: Promise<any> | null
}

const globalStoreKey: MiddlewareStoreKey<RefreshTokenGlobalStore> = Symbol('refreshToken')
const { init: initGlobalStore, get: getGlobalStore } =
  MiddlewareHelper.createGlobalStore(globalStoreKey)

function init() {
  if (getGlobalStore()?.initialed) return
  initGlobalStore({
    initialed: true,
    refreshPromise: null,
  })
}

interface RefreshTokenStore {
  options: RequestRefreshTokenOptions
}

const storeKey: MiddlewareStoreKey<RefreshTokenStore> = Symbol('refreshToken')

export function RequestRefreshToken(options: RequestRefreshTokenOptions) {
  init()

  const middleware: RequestMiddleware = {
    priority: 1000,
    setup: (ctx) => {
      MiddlewareHelper.initStore(storeKey, ctx, {
        options: assign(
          { allow: () => true } as Partial<RequestRefreshTokenOptions>,
          options,
          pick(ctx.getOptions().refreshToken || {}, ['allow']),
        ),
      })
    },
    handler: (ctx, next) => {
      const globalStore = getGlobalStore()!
      const { options } = MiddlewareHelper.getStore(storeKey, ctx)!
      const { fetcher, getKey, getOptions } = ctx

      ctx.fetcher = async (...args) => {
        // 正常执行
        if (globalStore.refreshPromise == null || !toValue(options.allow, getKey(), ctx))
          return fetcher(...args)

        try {
          const data = await fetcher(...args)
          await getOptions().dataParser(data)
        } catch (err: unknown) {
          const error = ensureError(err)
          const isExpired = await options.expired(error)
          if (!isExpired) return Promise.reject(error)

          if (!globalStore.refreshPromise) globalStore.refreshPromise = options.handler(ctx)

          return Promise.resolve(globalStore.refreshPromise)
            .then(() => fetcher(...args))
            .catch(() => Promise.reject(error))
        }
      }

      return next()
    },
  }

  return middleware
}

declare module '@rhao/request' {
  interface RequestCustomOptions<TData, TParams extends unknown[] = unknown[]> {
    refreshToken?: Pick<RequestRefreshTokenOptions, 'allow'>
  }
}
