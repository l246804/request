import type { RequestContext, RequestHooks } from '.'

export function createPendingHelper() {
  const pendingContexts: RequestContext<any, any[]>[] = []
  const hasPending = () => pendingContexts.length === 0

  const hooks: Partial<RequestHooks> = {
    before: (_, ctx) => {
      if (!pendingContexts.includes(ctx)) pendingContexts.push(ctx)
    },
    end: (ctx) => {
      const index = pendingContexts.indexOf(ctx)
      index > -1 && pendingContexts.splice(index, 1)
    },
    dispose: () => {
      pendingContexts.length = 0
    },
  }

  return {
    pendingContexts,
    hasPending,
    hooks,
  }
}
