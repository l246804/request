import { createRequest } from '@rhao/request/index'
import {
  RequestDebounce,
  RequestRefresh,
  RequestRetry,
  RequestSWR,
  RequestThrottle,
} from '@rhao/request-basic-middleware/index'
import { RequestVue } from '@rhao/request-middleware-vue/index'

export const useRequest = createRequest({
  manual: true,
  middleware: [
    RequestDebounce(),
    RequestThrottle(),
    RequestRetry(),
    RequestRefresh({ errorRetryCount: 3 }),
    RequestVue(),
    RequestSWR(),
  ],
})
