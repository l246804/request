import type { RequestContext } from './context'

export function createPendingManager() {
  const pendingContexts: RequestContext<any, any[]>[] = []

  const hasPending = () => pendingContexts.length === 0
  const clearPending = () => {
    pendingContexts.length = 0
  }
  const clearPendingWithCancel = () => {
    pendingContexts.forEach((ctx) => ctx?.cancel())
    pendingContexts.length = 0
  }

  const configHooks = {
    before: (_, ctx) => {
      if (!pendingContexts.includes(ctx)) pendingContexts.push(ctx)
    },
    finally: (ctx) => {
      const index = pendingContexts.indexOf(ctx)
      index > -1 && pendingContexts.splice(index, 1)
    },
    dispose: () => {
      clearPending()
    },
  }

  return {
    pendingContexts,
    configHooks,
    hasPending,
    clearPending,
    clearPendingWithCancel,
  }
}
