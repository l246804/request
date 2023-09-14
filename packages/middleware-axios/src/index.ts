import type {
  RequestBasicContext,
  RequestContext,
  RequestMiddleware,
  StoreKey,
} from '@rhao/request'
import type { AxiosInstance, AxiosRequestConfig, AxiosStatic } from 'axios'
import { toValue } from '@rhao/lodash-x'
import type { MaybeFn } from '@rhao/types-base'
import Axios from 'axios'
import utils from 'axios/unsafe/utils.js'

export interface RequestAxiosOptions {
  /**
   * 是否关联取消，如果设为 `true`，当调用 `cancel` 时也会取消 `axios` 请求
   * @default false
   */
  associativeCancel?: boolean
}

interface AxiosStore {
  options: RequestAxiosOptions
}

const storeKey: StoreKey<AxiosStore> = Symbol('axios')

// 更改原型函数，调用时连接 context
let fetchingCtx: RequestBasicContext<any, any[]> | null = null
const originalRequest = Axios.Axios.prototype.request
// @ts-expect-error
Axios.Axios.prototype.request = function wrapRequest(configOrUrl, config) {
  if (typeof configOrUrl === 'string') {
    config = config || {}
    config.url = configOrUrl
  }
  else {
    config = configOrUrl || {}
  }

  if (fetchingCtx == null) return originalRequest.call(this, config)

  const ctx = fetchingCtx!
  fetchingCtx = null

  // 合并配置项
  config = utils.merge(config, toValue(ctx.getOptions().axiosConfig, this, ctx))

  // 关联取消
  const { associativeCancel } = ctx.getStore(storeKey).options
  if (associativeCancel) {
    const source = Axios.CancelToken.source()
    config.cancelToken = source.token

    const remove = ctx.hooks.hookOnce('cancel', () => source.cancel())
    ctx.hooks.hookOnce('finally', remove)
  }

  return originalRequest.call(this, config)
}

export function RequestAxios(initialOptions?: RequestAxiosOptions) {
  const middleware: RequestMiddleware = {
    name: 'RequestAxios',
    priority: 10000,
    setup: (ctx) => {
      const { fetcher } = ctx

      ctx.setStore(storeKey, {
        options: Object.assign(
          { associativeCancel: false } as RequestAxiosOptions,
          initialOptions,
          ctx.getOptions(),
        ),
      })

      ctx.fetcher = (...args) => {
        fetchingCtx = ctx
        const result = fetcher(...args)
        fetchingCtx = null
        return result
      }
    },
  }

  return middleware
}

declare module '@rhao/request' {
  interface RequestOptions<TData, TParams extends unknown[] = unknown[]> {
    /**
     * 是否关联取消，如果设为 `true`，当调用 `cancel` 时也会取消 `axios` 请求
     * @default false
     */
    associativeCancel?: boolean
    /**
     * axios 配置项
     */
    axiosConfig?: MaybeFn<
      AxiosRequestConfig<TData>,
      [axios: AxiosInstance | AxiosStatic, context: RequestContext<TData, TParams>]
    >
  }
}
