import { createRequest } from '@rhao/request/index'
import { createMiddleware } from '@rhao/request-basic-middleware/index'
import { RequestVue } from '@rhao/request-middleware-vue/index'

export const useRequest = createRequest({
  manual: true,
  middleware: [RequestVue(), ...createMiddleware({ refresh: { errorRetryCount: 3 } })],
})
