import type { RequestDebounceOptions } from './debounce'
import { RequestDebounce } from './debounce'
import type { RequestThrottleOptions } from './throttle'
import { RequestThrottle } from './throttle'
import type { RequestRefreshOptions } from './refresh'
import { RequestRefresh } from './refresh'
import type { RequestRetryOptions } from './retry'
import { RequestRetry } from './retry'
import type { RequestSWROptions } from './swr'
import { RequestSWR } from './swr'

export function createMiddleware(options?: {
  debounce?: RequestDebounceOptions
  throttle?: RequestThrottleOptions
  refresh?: RequestRefreshOptions
  retry?: RequestRetryOptions
  swr?: RequestSWROptions
}) {
  return [
    RequestDebounce(options?.debounce),
    RequestThrottle(options?.throttle),
    RequestRefresh(options?.refresh),
    RequestRetry(options?.retry),
    RequestSWR(options?.swr),
  ]
}
