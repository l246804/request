import { createRequest } from '@rhao/request'
import { RequestSWR } from '@rhao/request-basic-middleware/swr'
import { RequestVue } from '@rhao/request-middleware-vue'

export const useRequest = createRequest({
  manual: true,
  middleware: [RequestVue(), RequestSWR()],
})
