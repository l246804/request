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

        // 如果存在正在刷新 token 的请求则等待其结束后再调用
        if (globalStore.refreshPromise)
          return Promise.resolve(globalStore.refreshPromise).then(() => fetcher(...args))

        try {
          // 正常调用 fetcher，之后再通过 dataParser 解析数据，验证请求是否失败
          const data = await fetcher(...args)
          await getOptions().dataParser(data)
        } catch (err: unknown) {
          // 请求失败后验证根据当前的错误验证是否是 token 过期导致的
          const error = ensureError(err)
          const isExpired = await options.expired(error)
          if (!isExpired) return Promise.reject(error)

          // 如果是过期导致的则调用注册时传入的 handler 进行处理
          if (!globalStore.refreshPromise) globalStore.refreshPromise = options.handler(ctx)

          return (
            Promise.resolve(globalStore.refreshPromise)
              // 新的请求出错则抛出新请求的错误
              .then(() => Promise.resolve(fetcher(...args)).catch((e) => Promise.reject(e)))
              // 异常时抛出初次执行请求时的错误
              .catch(() => Promise.reject(error))
              .finally(() => {
                // 结束后清空 promise
                globalStore.refreshPromise = null
              })
          )
        }
      }

      // 调用下一个中间件
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
