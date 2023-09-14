import type { MaybeFn } from '@rhao/types-base'
import { toValue } from '@rhao/lodash-x'
import type { RequestMiddleware } from '../middleware'

export function RequestReady() {
  const middleware: RequestMiddleware = {
    name: 'Builtin:RequestReady',
    priority: 100000,
    setup(ctx) {
      const { hooks, getOptions } = ctx

      hooks.hook('preface', (params, ctx) => {
        const { ready = true } = getOptions()
        if (!toValue(ready, params)) ctx.cancel(true)
      })
    },
  }

  return middleware
}

declare module '@rhao/request' {
  // eslint-disable-next-line unused-imports/no-unused-vars
  export interface RequestOptions<TData, TParams extends unknown[] = unknown[]> {
    /**
     * 执行是否就绪
     * @default true
     */
    ready?: MaybeFn<boolean, [TParams]>
  }
}
