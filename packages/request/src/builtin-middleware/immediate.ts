/* eslint-disable unused-imports/no-unused-vars */
import type { RequestMiddleware } from '../middleware'

export function RequestImmediate() {
  const middleware: RequestMiddleware = {
    priority: 1000,
    setup: (ctx) => {
      const { getOptions, getResult } = ctx
      const { immediate = true, defaultParams = [] } = getOptions()

      immediate && getResult().run(...defaultParams)
    },
  }
  return middleware
}

declare module '@rhao/request' {
  export interface RequestBasicOptions {
    /**
     * 是否立即执行
     * - `true`: 创建后自动执行
     * - `false`: 手动调用 `run` 执行
     * @default false
     */
    immediate?: boolean
  }

  export interface RequestOptions<TData, TParams extends unknown[] = unknown[]> {
    /**
     * 默认执行参数，仅在创建时第一次自动执行有效
     */
    defaultParams?: TParams
  }
}
