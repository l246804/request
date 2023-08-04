import { pauseableTimer } from '@rhao/request-utils'
import type { RequestMiddleware } from '.'

export function RequestLoading() {
  const middleware: RequestMiddleware = {
    priority: 1000,
    setup: (ctx) => {
      const { hooks, getState, getOptions, mutateState } = ctx
      const timer = pauseableTimer(() => show(), getOptions().loadingDelay, {
        timerType: 'setTimeout',
        immediate: false,
      })

      hooks.hook('before', () => {
        if (!timer.isActive() && !getState().loading)
          getOptions().loadingDelay > 0 ? timer.resume() : timer.flush()
      })

      hooks.hook('end', (ctx) => {
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
