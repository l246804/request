/* eslint-disable unused-imports/no-unused-vars */
import type { BasicRequest, RequestContext, RequestMiddleware } from '@rhao/request'
import { assign, ensureError, pick, toValue } from '@rhao/request-utils'
import type { AwaitableFn, PromiseFn } from '@rhao/request-types'
import { once } from 'lodash-unified'

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

let refreshPromiseMap: WeakMap<BasicRequest, Promise<any> | null>
const init = once(() => {
  refreshPromiseMap = new WeakMap()
})

export function RequestRefreshToken(initialOptions: RequestRefreshTokenOptions) {
  init()

  const middleware: RequestMiddleware = {
    priority: 1000,
    handler: (ctx, next) => {
      const options = assign(
        { allow: () => true } as Partial<RequestRefreshTokenOptions>,
        initialOptions,
        pick(ctx.getOptions().refreshToken || {}, ['allow']),
      )
      const { request, fetcher, getKey, getOptions } = ctx

      ctx.fetcher = async (...args) => {
        // 正常执行
        if (!refreshPromiseMap.has(request) || !toValue(options.allow, getKey(), ctx))
          return fetcher(...args)

        // 如果存在正在刷新 token 的请求则等待其结束后再调用
        if (refreshPromiseMap.has(request))
          return Promise.resolve(refreshPromiseMap.get(request)).then(() => fetcher(...args))

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
          if (!refreshPromiseMap.has(request)) refreshPromiseMap.set(request, options.handler(ctx))

          return (
            Promise.resolve(refreshPromiseMap.get(request))
              // 新的请求出错则抛出新请求的错误
              .then(() => Promise.resolve(fetcher(...args)).catch((e) => Promise.reject(e)))
              // 异常时抛出初次执行请求时的错误
              .catch(() => Promise.reject(error))
              .finally(() => {
                // 结束后清空 promise
                refreshPromiseMap.delete(request)
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
