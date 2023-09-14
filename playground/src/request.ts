import type { BasicRequestHook, RequestFetcher, RequestOptions, RequestResult } from '@rhao/request'
import { createRequestHook } from '@rhao/request'
import { RequestSWR } from '@rhao/request-basic-middleware/swr'
import { RequestRetry } from '@rhao/request-basic-middleware/retry'
import { RequestRefresh } from '@rhao/request-basic-middleware/refresh'
import { RequestRefreshToken } from '@rhao/request-basic-middleware/refresh-token'
import { RequestVue } from '@rhao/request-middleware-vue'
import { RequestAxios } from '@rhao/request-middleware-axios'
import type { AxiosError, AxiosResponse } from 'axios'

interface UseRequest extends BasicRequestHook {
  <TData, TParams extends unknown[] = unknown[]>(
    fetcher: RequestFetcher<TData, TParams>,
    options?: RequestOptions<TData, TParams>,
  ): RequestResult<TData extends AxiosResponse<infer D> ? D : TData, TParams>
}

interface DataBasicFormat {
  code: number
  result: any
  msg: string
}

export const useRequest = createRequestHook({
  immediate: false,
  middleware: [
    RequestAxios({ associativeCancel: true }),
    RequestVue(),
    RequestSWR({ persistent: true }),
    RequestRetry(),
    RequestRefresh(),
    RequestRefreshToken({
      expired: (e) => {
        const error = e as AxiosError
        return [401, 403].includes(error.response?.status as any)
      },
      handler: async () => {
        //
      },
    }),
  ],
  dataParser: (data: AxiosResponse<DataBasicFormat>) => {
    if (data.data.code !== 200) throw new Error(data.data.msg)
    return data.data.result
  },
}) as UseRequest
