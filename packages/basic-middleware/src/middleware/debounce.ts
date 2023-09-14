/* eslint-disable unused-imports/no-unused-vars */
import type { RequestMiddleware } from '@rhao/request'
import type { DebounceSettings } from 'lodash-unified'
import { assign, debounce, isNil, mapValues, pick } from 'lodash-unified'
import { toValue } from '@rhao/lodash-x'

import type { MaybeGetter } from '@rhao/types-base'

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
    name: 'Basic:RequestDebounce',
    priority: -1000,
    setup: (ctx) => {
      const options = assign(
        { leading: false, trailing: true } as RequestDebounceOptions,
        initialOptions,
        ctx.getOptions().debounce,
      )

      if (!isNil(options.wait)) {
        // opts.maxWait 不能显示设置为空
        const opts = mapValues(pick(options, ['maxWait', 'leading', 'trailing']), (v) =>
          toValue(v)) as DebounceSettings
        const debouncedExecutor = debounce(ctx.executor, options.wait, opts)

        ctx.hooks.hook('cancel', () => debouncedExecutor.cancel())
        ctx.executor = (...args) => Promise.resolve(debouncedExecutor(...args))
      }
    },
  }
  return middleware
}

declare module '@rhao/request' {
  interface RequestOptions<TData, TParams extends unknown[] = unknown[]> {
    /**
     * 防抖配置
     */
    debounce?: RequestDebounceOptions
  }
}
