import type { RequestMiddleware } from '@rhao/request'
import { assign, isUndef, mapValues, pick, toValue } from '@rhao/request-utils'
import { debounce } from 'lodash-es'
import type { MaybeGetter } from 'types/utils'

export interface RequestDebounceOptions {
  /**
   * 防抖等待时间，单位：ms，设置后开启防抖模式
   */
  wait?: number
  /**
   * 延迟时最大等待时间
   */
  maxWait?: MaybeGetter<number>
  /**
   * 在延迟开始前执行调用
   * @default false
   */
  leading?: MaybeGetter<boolean>
  /**
   * 在延迟结束后执行调用
   * @default true
   */
  trailing?: MaybeGetter<boolean>
}

export function RequestDebounce(initialOptions?: RequestDebounceOptions) {
  const middleware: RequestMiddleware = {
    priority: -1000,
    setup: (ctx) => {
      const options = assign(
        { leading: false, trailing: true } as RequestDebounceOptions,
        initialOptions,
        ctx.getOptions().debounce,
      )

      if (!isUndef(options.wait)) {
        // opts.maxWait 不能显示设置为空
        const opts = mapValues(pick(options, ['maxWait', 'leading', 'trailing']), (v) => toValue(v))
        const debouncedExecutor = debounce(ctx.executor, options.wait, opts)

        ctx.hooks.hook('cancel', () => debouncedExecutor.cancel())
        ctx.executor = (...args) => Promise.resolve(debouncedExecutor(...args))
      }
    },
  }
  return middleware
}

declare module '@rhao/request' {
  interface RequestCustomOptions {
    debounce?: RequestDebounceOptions
  }
}
