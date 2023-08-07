import type { RequestMiddleware } from '.'

export function RequestManual() {
  const middleware: RequestMiddleware = {
    priority: 1000,
    setup: (ctx) => {
      const { getOptions, getResult } = ctx
      !getOptions().manual && getResult().run(...(getOptions().defaultParams || []))
    },
  }

  return middleware
}
