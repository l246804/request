/* eslint-disable unused-imports/no-unused-vars */
import type { RequestMiddleware } from '@rhao/request'
import { toValue } from 'nice-fns'
import { assign, isNil, mapValues, pick, throttle } from 'lodash-unified'
import type { MaybeGetter } from '@rhao/types-base'

export interface RequestThrottleOptions {
  /**
   * 节流等待时间，单位：ms，设置后开启节流模式
   */
  wait?: number
  /**
   * 在延迟开始前执行调用
   * @default true
   */
  leading?: MaybeGetter<boolean>
  /**
   * 在延迟结束后执行调用
   * @default true
   */
  trailing?: MaybeGetter<boolean>
}

export function RequestThrottle(initialOptions?: RequestThrottleOptions) {
  const middleware: RequestMiddleware = {
    name: 'Basic:RequestThrottle',
    priority: -1000,
    setup: (ctx) => {
      const options = assign(
        {} as RequestThrottleOptions,
        initialOptions,
        ctx.getOptions().throttle,
      )

      if (!isNil(options.wait)) {
        // opts.leading、opts.trailing 不能显示设置为空
        const opts = mapValues(pick(options, ['leading', 'trailing']), (v) => toValue(v))
        const throttledExecutor = throttle(ctx.executor, options.wait, opts)

        ctx.hooks.hook('cancel', () => throttledExecutor.cancel())
        ctx.executor = (...args) => Promise.resolve(throttledExecutor(...args))
      }
    },
  }
  return middleware
}

declare module '@rhao/request' {
  interface RequestOptions<TData, TParams extends unknown[] = unknown[]> {
    /**
     * 节流配置
     */
    throttle?: RequestThrottleOptions
  }
}
