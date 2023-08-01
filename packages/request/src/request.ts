import {
  assign,
  createSwitch,
  createTimer,
  ensureError,
  isString,
  keysOf,
  toValue,
  unique,
} from '@rhao/request-utils'
import type { Recordable } from 'types/utils'
import type { RequestBasicOptions, RequestOptions } from './options'
import { createCounter } from './counter'
import type { RequestResult } from './result'
import type { RequestFetcher } from './fetcher'
import type { RequestBasicContext, RequestContext } from './context'
import { createLoadingController } from './loading-controller'
import { compose } from './compose'
import type { RequestState } from './state'
import { createHooks } from './hooks'
import { sortMiddleware } from './middleware'

export interface BasicRequest {
  /**
   * 计数器，调用 `request()` 时生成默认的唯一标识
   */
  counter: ReturnType<typeof createCounter>

  /**
   * 全局配置项
   */
  options: Required<RequestBasicOptions>

  /**
   * `request`
   */
  <TData, TParams extends unknown[] = unknown[]>(
    fetcher: RequestFetcher<TData, TParams>,
    options?: RequestOptions<TData, TParams>,
  ): RequestResult<TData, TParams>
}

/**
 * 创建 `request()` 函数，基于中间件和 `hooks` 满足不同场景下的需求。
 */
export function createRequest(options?: RequestBasicOptions) {
  request.counter = createCounter()
  request.options = assign(
    {
      keyGenerator: () => `__request__${request.counter.next()}`,
      manual: false,
      loadingDelay: undefined,
      hooks: [],
      middleware: [],
    } as RequestBasicOptions,
    options,
  ) as Required<RequestBasicOptions>

  function request(fetcher: RequestFetcher<any, any[]>, opts?: RequestOptions<any, any[]>) {
    const options = assign({ ready: true } as RequestOptions<any, any[]>, request.options, opts)
    const key = options.key || options.keyGenerator() || `__request__${request.counter.next()}`
    const hooks = createHooks()

    // create state
    const state: RequestState<any, any[]> = {
      params: [],
      data: options.initData?.(),
      error: undefined,
      loading: false,
    }

    // create result
    const result: RequestResult<any, any[]> = {
      getKey: () => key,
      getState: () => assign({}, state),
      cancel,
      run,
      refresh,
    }

    // create basic context
    const basicContext: RequestBasicContext<any, any[]> = {
      request: request as any,
      hooks,
      fetcher,
      executor,
      getKey: () => key,
      getOptions: () => assign({}, options),
      getState: () => assign({}, state),
      mutateState: (keyOrState, value?) => {
        let mutatedValue = keyOrState

        if (isString(keyOrState)) {
          if (!keysOf(state).includes(keyOrState))
            return console.warn(`mutateState(): ${keyOrState} is not exist.`)
          mutatedValue = { [keyOrState]: value }
        }

        assign(state, mutatedValue)
        hooks.callHookSync('stateChange', mutatedValue, basicContext)
      },
      mutateResult: (fn) => {
        assign(result, fn(result))
      },
    }

    // last-time created contexxt
    let currentContext: RequestContext<any, any[]> | null = null

    // create loading-controller
    const { show: showLoading, close: closeLoading } = createLoadingController(
      (loading, context) => {
        if (!loading) currentContext = null
        context.mutateState({ loading })
        hooks.callHookSync('loadingChange', loading, context)
      },
    )

    // merge middleware
    const configMiddleware = unique(
      request.options.middleware
        .slice(0)
        .concat(opts?.middleware || [])
        .filter(Boolean),
    )

    // merge hooks
    const configHooks = unique(
      request.options.hooks
        .slice(0)
        .concat(opts?.hooks || [])
        .filter(Boolean),
    )

    // register hooks
    hooks.hook('error', (error) => {
      const state: Recordable = { error }
      if (toValue(options.initDataWhenError)) state.data = options.initData?.()
      basicContext.mutateState(state)
    })
    configHooks.forEach((configHook) => hooks.addHooks(configHook))

    // create executor
    async function executor(...params) {
      // if "ready" is false, do nothing
      if (!toValue(options.ready, params)) return

      // create switch of cancel
      const { read: isCanceled, toggle } = createSwitch()
      const cancel = (silent = false) => {
        if (isCanceled()) return
        toggle(true)
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        !silent && hooks.callHook('cancel', context.getState(), context)
      }

      // create context
      let context = (currentContext = {
        ...basicContext,
        isCanceled,
        cancel,
      })

      // if "isCanceled()" is "true", returns
      const middleware = sortMiddleware(configMiddleware).map((mw) => {
        return (ctx, next) => {
          if (ctx.isCanceled()) return
          return mw(ctx, next)
        }
      })

      // create "applyMiddleware"
      const applyMiddleware = compose(middleware)

      // applyMiddleware's next
      async function next() {
        if (isCanceled()) return
        const data = await context.fetcher(...state.params)
        context.mutateState({ data })
        return data
      }

      // create loading timer
      const loadingTimer = createTimer(() => showLoading(context), options.loadingDelay)

      // handle error
      const errorHandler = async (err: unknown) => {
        const error = ensureError(err)
        await hooks.callHook('error', error, context)
      }

      // create cleanup
      const cleanup = () => {
        loadingTimer.clear()
        closeLoading(context)
        context = null as any
      }

      try {
        loadingTimer.start()
        context.mutateState({ params, error: undefined })

        await hooks.callHook('before', state.params, context)
        if (isCanceled()) return

        await applyMiddleware(context, next)

        if (isCanceled()) return
        await hooks.callHook('success', state.data, context)
      } catch (err: unknown) {
        await errorHandler(err)
      } finally {
        isCanceled() && cleanup()
      }

      try {
        await hooks.callHook('after', context.getState(), context)
      } catch (err: unknown) {
        await errorHandler(err)
      } finally {
        cleanup()
      }
    }

    function cancel() {
      if (currentContext) {
        currentContext.cancel()
        closeLoading(currentContext, true)
        currentContext = null
      }
    }

    function run(...args) {
      return executor(...args).then(() => state.data)
    }

    function refresh() {
      return run(...state.params)
    }

    // init middleware
    configMiddleware.forEach((mw) => mw.setup?.(basicContext))

    // automatic execute
    if (!options.manual) executor(...(options.defaultParams || []))

    return result
  }

  return request as BasicRequest
}
