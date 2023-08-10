import { MiddlewareHelper } from '@rhao/request'
import type { MiddlewareStoreKey, RequestContext, RequestMiddleware } from '@rhao/request'
import type {
  AxiosHeaders,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosStatic,
  InternalAxiosRequestConfig,
  RawAxiosRequestHeaders,
} from 'axios'
import { assign, pick, toValue } from '@rhao/request-utils'
import type { MaybeFn } from '@rhao/request-types'
import Axios from 'axios'
import utils from 'axios/unsafe/utils.js'

export interface RequestAxiosOptions {
  /**
   * axios 实例
   */
  axios: AxiosInstance | AxiosStatic
  /**
   * 是否关联取消，如果设为 `true`，当调用 `cancel` 时也会取消 `axios` 请求
   * @default false
   */
  associativeCancel?: boolean
}

interface AxiosStore {
  id: number
  options: RequestAxiosOptions
}

const storeKey: MiddlewareStoreKey<AxiosStore> = Symbol('axios')

const ID = '__REQUEST_AXIOS_ID__'
let i = 0
function genId() {
  return i++
}

export function RequestAxios(options: RequestAxiosOptions) {
  const middleware: RequestMiddleware = {
    priority: 10000,
    setup: (ctx) => {
      const { getOptions } = ctx

      // 初始化 store
      MiddlewareHelper.initStore(storeKey, ctx, {
        id: genId(),
        options: assign(
          { associativeCancel: false } as RequestAxiosOptions,
          options,
          pick(getOptions(), ['axios']),
        ),
      })
    },
    handler(ctx, next) {
      const { id, options } = MiddlewareHelper.getStore(storeKey, ctx)!
      const { axios, associativeCancel } = options

      const requestId = axios.interceptors.request.use(
        (config) => {
          const axiosConfig = toValue(ctx.getOptions().axiosConfig, config, axios, ctx)
          if (axiosConfig) {
            // 合并配置项
            config = utils.merge(config, axiosConfig)
          }

          // 关联取消
          if (associativeCancel) {
            const source = Axios.CancelToken.source()
            config.cancelToken = source.token

            const remove = ctx.hooks.hookOnce('cancel', () => source.cancel())
            ctx.hooks.hookOnce('finally', remove)
          }

          axios.interceptors.request.eject(requestId)

          return config
        },
        null,
        {
          runWhen: (config) => config[ID] === id,
        },
      )

      const { fetcher } = ctx
      ctx.fetcher = (...args) => {
        axios.defaults[ID] = id
        const promise = fetcher(...args)
        axios.defaults[ID] = undefined

        return promise
      }

      return next()
    },
  }

  return middleware
}

declare module '@rhao/request' {
  interface RequestCustomOptions<TData, TParams extends unknown[] = unknown[]> {
    /**
     * axios 实例
     */
    axios?: AxiosInstance | AxiosStatic
    /**
     * 是否关联取消，如果设为 `true`，当调用 `cancel` 时也会取消 `axios` 请求
     * @default false
     */
    associativeCancel?: boolean
    /**
     * axios 配置项
     */
    axiosConfig?: MaybeFn<
      AxiosRequestConfig & { headers: RawAxiosRequestHeaders | AxiosHeaders },
      [
        config: InternalAxiosRequestConfig,
        axios: RequestAxiosOptions['axios'],
        context: RequestContext<TData, TParams>,
      ]
    >
  }
}
