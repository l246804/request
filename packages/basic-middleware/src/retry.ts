/* eslint-disable unused-imports/no-unused-vars */
import type { RequestContext, RequestMiddleware } from '@rhao/request'
import { assign, ensureError, sleep, toValue } from '@rhao/request-utils'
import type { AwaitableFn, Fn, MaybeFn, MaybeGetter } from 'types/utils'

export interface RequestRetryOptions {
  /**
   * 错误重试次数，如果设置为 `-1`，则无限次重试
   * @default 0
   */
  count?: MaybeGetter<number>
  /**
   * 是否允许错误重试，在执行 `fetcher()` 后验证，返回 `false` 则回归原执行流，否则开始错误重试
   * @default
   * ```ts
   * () => true
   * ```
   */
  allow?: AwaitableFn<[error: Error, key: string, context: RequestContext<any, any[]>], boolean>
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
      const { hooks, fetcher, getOptions, isCanceled } = ctx
      const options = assign(
        {
          count: 0,
          allow: () => true,
          interval: (count) => Math.min(30e3, 2e3 ** count),
        } as RequestRetryOptions,
        initialOptions,
        getOptions().retry,
      )

      const countValue = toValue(options.count!)
      if (countValue !== -1 && countValue < 1) return

      const callFetcher = async (...args) => {
        const result = { data: undefined as any, error: undefined as Error | undefined }
        if (isCanceled()) return result

        try {
          const data = await fetcher(...args)
          await getOptions().dataParser(data)
          result.data = data
        } catch (err: unknown) {
          const error = ensureError(err)
          result.error = error
        }

        return result
      }

      let count = 0
      ctx.fetcher = async (...args) => {
        // 正常调用
        let result = await callFetcher(...args)
        if (!result.error) return result.data

        const valid = await options.allow!(result.error, ctx.getKey(), ctx)
        if (!valid) return Promise.reject(result.error)

        // 重试
        // eslint-disable-next-line no-unmodified-loop-condition
        while ((countValue === -1 || count++ < countValue) && result.error && !isCanceled()) {
          hooks.callHook('retry:progress', count)
          hooks.callHook('error', result.error, ctx)

          await sleep(toValue(options.interval, count))
          result = await callFetcher(...args)
        }

        if (result.error) {
          hooks.callHook('retry:fail')
          return Promise.reject(result.error)
        }

        hooks.callHook('retry:success')
        return result.data
      }

      return next()
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
     * 重试进行中
     */
    'retry:progress': Fn<[count: number]>
    /**
     * 重试前触发
     */
    'retry:success': Fn<[]>
    /**
     * 重试后触发
     */
    'retry:fail': Fn<[]>
  }
}
