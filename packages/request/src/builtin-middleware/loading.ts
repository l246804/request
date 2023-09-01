import { pauseableTimer } from '@rhao/lodash-x'
import type { RequestMiddleware } from '../middleware'

export function RequestLoading() {
  const middleware: RequestMiddleware = {
    priority: 1000,
    setup: (ctx) => {
      const { hooks, getState, getOptions, mutateState } = ctx
      const { loadingDelay = 300 } = getOptions()

      const timer = pauseableTimer(() => show(), loadingDelay, {
        timerType: 'setTimeout',
        immediate: false,
      })

      hooks.hook('before', () => {
        if (!timer.isActive() && !getState().loading)
          loadingDelay > 0 ? timer.resume() : timer.flush()
      })

      hooks.hook('finally', (ctx) => {
        if (ctx.isLatestExecution()) {
          timer.pause()
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

declare module '@rhao/request' {
  export interface RequestBasicOptions {
    /**
     * `loading` 延迟时间，单位：`ms`，如果值大于 0，则启动延迟，若请求在延迟前结束则不会更新 `loading` 状态
     * @default 300
     */
    loadingDelay?: number
  }
}
