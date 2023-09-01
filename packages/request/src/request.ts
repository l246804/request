import { type RequestBasicOptions } from './options'
import { createRequestHook as baseCreateRequestHook } from './core'
import { RequestReady } from './builtin-middleware/ready'
import { RequestError } from './builtin-middleware/error'
import { RequestImmediate } from './builtin-middleware/immediate'
import { RequestLoading } from './builtin-middleware/loading'
import { RequestSingle } from './builtin-middleware/single'

export type { BasicRequestHook } from './core'

export * from './builtin-middleware/ready'
export * from './builtin-middleware/error'
export * from './builtin-middleware/immediate'
export * from './builtin-middleware/loading'
export * from './builtin-middleware/single'

/**
 * 创建 `request()` 函数，基于中间件和 `hooks` 满足不同场景下的需求。
 */
export function createRequestHook(options?: RequestBasicOptions) {
  options ||= {}
  options.middleware ||= []
  options.middleware.push(
    RequestReady(),
    RequestSingle(),
    RequestImmediate(),
    RequestLoading(),
    RequestError(),
  )
  return baseCreateRequestHook(options)
}
