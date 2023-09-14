import { toValue } from '@rhao/lodash-x'
import type { MaybeGetter } from '@rhao/types-base'
import type { RequestMiddleware } from '../middleware'

export function RequestError() {
  const middleware: RequestMiddleware = {
    name: 'Builtin:RequestError',
    priority: 1000,
    setup: (ctx) => {
      const { hooks, getOptions, mutateState } = ctx

      hooks.hook('error', (error, { mutateData }) => {
        const { initDataWhenError = true } = getOptions()

        if (toValue(initDataWhenError)) mutateData(getOptions().initData?.())
        mutateState({ error })
      })
    },
  }

  return middleware
}

declare module '@rhao/request' {
  export interface RequestBasicOptions {
    /**
     * 执行失败时是否初始化数据
     * @default true
     */
    initDataWhenError?: MaybeGetter<boolean>
  }
}
