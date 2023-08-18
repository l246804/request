import { toValue } from '@rhao/request-utils'
import type { RequestMiddleware } from './middleware'

export function RequestError() {
  const middleware: RequestMiddleware = {
    priority: 1000,
    setup: (ctx) => {
      const { hooks, getOptions, mutateState } = ctx

      hooks.hook('error', (error, { mutateData }) => {
        if (toValue(getOptions().initDataWhenError)) mutateData(getOptions().initData?.())
        mutateState({ error })
      })
    },
  }

  return middleware
}
