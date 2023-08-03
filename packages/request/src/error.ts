import type { Recordable } from 'types/utils'
import { toValue } from '@rhao/request-utils'
import type { RequestMiddleware } from '.'

export function RequestError() {
  const middleware: RequestMiddleware = {
    priority: 1000,
    setup: (ctx) => {
      const { hooks, getOptions, mutateState } = ctx

      hooks.hook('error', (error) => {
        const state: Recordable = { error }
        if (toValue(getOptions().initDataWhenError)) state.data = getOptions().initData?.()
        mutateState(state)
      })
    },
  }

  return middleware
}
