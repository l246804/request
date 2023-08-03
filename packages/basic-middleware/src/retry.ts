/* eslint-disable unused-imports/no-unused-vars */
import type { RequestMiddleware } from '@rhao/request'
import { assign, ensureError, sleep, toValue } from '@rhao/request-utils'
import type { Fn, MaybeFn } from 'types/utils'

export interface RequestRetryOptions {
  /**
   * 错误重试次数，如果设置为 `-1`，则无限次重试
   * @default 0
   */
  count?: number
  /**
   * - 重试时间间隔,单位：ms
   * - 默认采用简易的指数退避算法
   *   + 第一次重试等待 2s
   *   + 第二次重试等待 4s
   *   + 以以此类推，如果大于 30s，则取 30s
   * @default
   * ```ts
   * 1000 * 2 ** retryCount
   * ```
   */
  interval?: MaybeFn<number, [count: number]>
}

export function RequestRetry(initialOptions?: RequestRetryOptions) {
  const middleware: RequestMiddleware = {
    priority: 999,
    handler: (ctx, next) => {
      const { hooks, fetcher, getOptions } = ctx
      const options = assign(
        {
          count: 0,
          interval: (count) => Math.min(30e3, 2e3 ** count),
        } as RequestRetryOptions,
        initialOptions,
        getOptions().retry,
      )

      const countValue = options.count!
      if (countValue !== -1 && countValue < 1) return

      const callFetcher = async (...args) => {
        const result = { data: undefined as any, error: undefined }
        try {
          const data = await fetcher(...args)
          getOptions().dataParser(data)
          result.data = data
        } catch (error) {
          result.error = error
        }
        return result
      }

      let count = 0
      ctx.fetcher = async (...args) => {
        // 正常调用
        let result = await callFetcher(...args)
        if (!result.error) return result.data

        // 重试
        // eslint-disable-next-line no-unmodified-loop-condition
        while ((countValue === -1 || count++ < countValue) && result.error) {
          await sleep(toValue(options.interval, count))
          hooks.callHookParallel('retry:before', { count })
          result = await callFetcher(...args)
          hooks.callHookParallel('retry:after', { ...result, count })
        }

        if (result.error) return Promise.reject(ensureError(result.error))
        return result.data
      }

      next()
    },
  }

  return middleware
}

declare module '@rhao/request' {
  interface RequestCustomOptions<TData, TParams extends unknown[] = unknown[]> {
    retry?: RequestRetryOptions
  }

  interface RequestCustomHooks<TData, TParams extends unknown[] = unknown[]> {
    /**
     * 重试前触发
     */
    'retry:before': Fn<[result: { count: number }]>
    /**
     * 重试后触发
     */
    'retry:after': Fn<[result: { data: any; error?: Error; count: number }]>
  }
}
