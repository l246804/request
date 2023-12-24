import type { MaybeFn, MaybeGetter } from '@rhao/types-base'
import { toValue } from 'nice-fns'
import type { RequestMiddleware } from '../middleware'

export function RequestSingle() {
  const middleware: RequestMiddleware = {
    name: 'Builtin:RequestSingle',
    priority: 1000,
    setup(ctx) {
      const { hooks, getOptions, getState, hasPending, clearPendingWithCancel } = ctx
      hooks.hook('preface', (params, ctx) => {
        const { single = false, singleWithForce = false } = getOptions()
        const singleValue = toValue(single, params, getState().params)

        if (singleValue) {
          if (toValue(singleWithForce)) clearPendingWithCancel()
          if (hasPending()) ctx.cancel(true)
        }
      })
    },
  }

  return middleware
}

declare module '@rhao/request' {
  export interface RequestBasicOptions {
    /**
     * 单例模式，如果设为 `true`，则存在未完成的执行时不会再执行
     * @default false
     */
    single?: MaybeFn<boolean, [newParams: unknown[], oldParams: unknown[]]>

    /**
     * 强制单例模式，如果设为 `true`，在执行前将取消之前的所有执行
     *
     * @default false
     */
    singleWithForce?: MaybeGetter<boolean>
  }
}
