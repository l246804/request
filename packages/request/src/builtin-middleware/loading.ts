import { timerWithControl } from 'nice-fns'
import type { Fn } from '@rhao/types-base'
import type { RequestMiddleware } from '../middleware'
import type { RequestBasicContext } from '../context'

export function RequestLoading() {
  const middleware: RequestMiddleware = {
    name: 'Builtin:RequestLoading',
    priority: 1000,
    setup: (ctx) => {
      const { hooks, getState, getOptions, mutateState } = ctx
      const { loadingDelay = 300 } = getOptions()

      const timer = timerWithControl(() => show(), { ms: loadingDelay })

      hooks.hook('before', () => {
        if (!timer.isActive() && !getState().loading)
          loadingDelay > 0 ? timer.start() : timer.flush()
      })

      hooks.hook('finally', (ctx) => {
        if (ctx.isLatestExecution()) {
          timer.stop()
          close()
        }
      })

      function handleToggle(loading: boolean) {
        if (getState().loading !== loading) {
          mutateState({ loading })
          hooks.callHookSync('loadingChange', loading, ctx)
        }
      }

      function show() {
        if (!getState().loading) handleToggle?.(true)
      }

      function close() {
        if (getState().loading) handleToggle?.(false)
      }
    },
  }

  return middleware
}

// 类型别名，防止导入类型被忽视
type Context<TData, TParams extends unknown[] = unknown[]> = RequestBasicContext<TData, TParams>

declare module '@rhao/request' {
  export interface RequestBasicOptions {
    /**
     * `loading` 延迟时间，单位：`ms`，如果值大于 0，则启动延迟，若请求在延迟前结束则不会更新 `loading` 状态
     * @default 300
     */
    loadingDelay?: number
  }

  export interface RequestConfigHooks<TData, TParams extends unknown[] = unknown[]> {
    /**
     * 请求状态变更时触发，多次并发调用仅在初次和最近执行结束后触发
     */
    loadingChange: Fn<[loading: boolean, context: Context<TData, TParams>], any>
  }
}
