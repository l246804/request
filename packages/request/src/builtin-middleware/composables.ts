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
        obj[camelCase(`on-${hookKey}`)] = (cb, options?: ComposableFnOptions) => {
          const { once = false } = options || {}
          if (once) {
            const _cb = cb
            cb = function (...args) {
              // eslint-disable-next-line @typescript-eslint/no-use-before-define
              fn()
              return _cb(...args)
            }
          }
          const fn = hooks.hook(hookKey as any, cb)
          return fn
        }
        return obj
      }, {} as Recordable<AnyFn>)

      // 将 composables 挂载至 result 上
      mutateResult(composables)
    },
  }

  return middleware
}

// 类型别名，防止导入类型被忽视
type ConfigHooks<TData, TParams extends unknown[] = unknown[]> = RequestConfigHooks<TData, TParams>

interface ComposableFnOptions {
  /**
   * 是否仅单次触发
   */
  once?: boolean
}

declare module '@rhao/request' {
  export interface RequestResult<TData, TParams extends unknown[] = unknown[]> {
    /**
     * `hook:preface`
     */
    onPreface: Fn<
      [callback: ConfigHooks<TData, TParams>['preface'], options?: ComposableFnOptions],
      NoopFn
    >
    /**
     * `hook:before`
     */
    onBefore: Fn<
      [callback: ConfigHooks<TData, TParams>['before'], options?: ComposableFnOptions],
      NoopFn
    >
    /**
     * `hook:success`
     */
    onSuccess: Fn<
      [callback: ConfigHooks<TData, TParams>['success'], options?: ComposableFnOptions],
      NoopFn
    >
    /**
     * `hook:error`
     */
    onError: Fn<
      [callback: ConfigHooks<TData, TParams>['error'], options?: ComposableFnOptions],
      NoopFn
    >
    /**
     * `hook:after`
     */
    onAfter: Fn<
      [callback: ConfigHooks<TData, TParams>['after'], options?: ComposableFnOptions],
      NoopFn
    >
    /**
     * `hook:finally`
     */
    onFinally: Fn<
      [callback: ConfigHooks<TData, TParams>['finally'], options?: ComposableFnOptions],
      NoopFn
    >
    /**
     * `hook:cancel`
     */
    onCancel: Fn<
      [callback: ConfigHooks<TData, TParams>['cancel'], options?: ComposableFnOptions],
      NoopFn
    >
    /**
     * `hook:discarded`
     */
    onDiscarded: Fn<
      [callback: ConfigHooks<TData, TParams>['discarded'], options?: ComposableFnOptions],
      NoopFn
    >
    /**
     * `hook:dispose`
     */
    onDispose: Fn<
      [callback: ConfigHooks<TData, TParams>['dispose'], options?: ComposableFnOptions],
      NoopFn
    >
  }
}
