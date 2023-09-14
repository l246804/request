import type { AnyFn, Fn, NoopFn, Recordable } from '@rhao/types-base'
import { camelCase } from 'lodash-unified'
import type { RequestMiddleware } from '../middleware'
import type { RequestConfigHooks } from '../hooks'

export function RequestComposables() {
  const middleware: RequestMiddleware = {
    name: 'Builtin:RequestComposables',
    setup: (ctx) => {
      const { hooks, mutateResult } = ctx
      const composableConfigHooks = [
        'preface',
        'before',
        'success',
        'error',
        'after',
        'finally',
        'cancel',
        'discarded',
        'dispose',
      ]
      const composables = composableConfigHooks.reduce((obj, hookKey) => {
        obj[camelCase(`on-${hookKey}`)] = (cb) => hooks.hook(hookKey as any, cb)
        return obj
      }, {} as Recordable<AnyFn>)

      // 将 composables 挂载至 result 上
      mutateResult(composables)
    },
  }

  return middleware
}

// 类型别名，防止导入类型被忽视
type ConfigHooks<TData, TParams extends unknown[]= unknown[]> = RequestConfigHooks<TData, TParams>

declare module '@rhao/request' {
  export interface RequestResult<TData, TParams extends unknown[] = unknown[]> {
    /**
     * `hook:preface`
     */
    onPreface: Fn<[callback: ConfigHooks<TData, TParams>['preface']], NoopFn>
    /**
     * `hook:before`
     */
    onBefore: Fn<[callback: ConfigHooks<TData, TParams>['before']], NoopFn>
    /**
     * `hook:success`
     */
    onSuccess: Fn<[callback: ConfigHooks<TData, TParams>['success']], NoopFn>
    /**
     * `hook:error`
     */
    onError: Fn<[callback: ConfigHooks<TData, TParams>['error']], NoopFn>
    /**
     * `hook:after`
     */
    onAfter: Fn<[callback: ConfigHooks<TData, TParams>['after']], NoopFn>
    /**
     * `hook:finally`
     */
    onFinally: Fn<[callback: ConfigHooks<TData, TParams>['finally']], NoopFn>
    /**
     * `hook:cancel`
     */
    onCancel: Fn<[callback: ConfigHooks<TData, TParams>['cancel']], NoopFn>
    /**
     * `hook:discarded`
     */
    onDiscarded: Fn<[callback: ConfigHooks<TData, TParams>['discarded']], NoopFn>
    /**
     * `hook:dispose`
     */
    onDispose: Fn<[callback: ConfigHooks<TData, TParams>['dispose']], NoopFn>
  }
}
