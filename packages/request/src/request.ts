import {
  assign,
  createSwitch,
  ensureError,
  isFunction,
  isString,
  keysOf,
  pauseableTimer,
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
import { normalizeMiddleware } from './middleware'

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
      initDataWhenError: false,
      manual: false,
      loadingDelay: 0,
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
    } as any

    // create basic context
    const basicContext: RequestBasicContext<any, any[]> = {
      request: request as any,
      hooks,
      fetcher,
      executor,
      getKey: () => key,
      getOptions: () => assign({}, options),
      getState: () => assign({}, state),
      getResult: () => assign({}, result),
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
      mutateResult: (res) => {
        assign(result, res)
      },
    }

    // last-time created context
    let currentContext: RequestContext<any, any[]> | null = null
    const isCurrentContext = (ctx: RequestContext<any, any[]>) =>
      !!currentContext && ctx === currentContext

    // create loading-controller
    const { show: showLoading, close: closeLoading } = createLoadingController(
      () => state.loading,
      (loading) => {
        if (!loading) currentContext = null
        if (state.loading !== loading) {
          basicContext.mutateState({ loading })
          hooks.callHookSync('loadingChange', loading, basicContext)
        }
      },
    )

    // merge middleware
    const configMiddleware = normalizeMiddleware(
      request.options.middleware.slice(0).concat(opts?.middleware || []),
    )

    // merge hooks
    const configHooks = unique(request.options.hooks.slice(0).concat(opts?.hooks || []))

    // register hooks
    hooks.hook('error', (error) => {
      const state: Recordable = { error }
      if (toValue(options.initDataWhenError)) state.data = options.initData?.()
      basicContext.mutateState(state)
    })
    configHooks.forEach((configHook) => hooks.addHooks(configHook))

    // create loading timer
    const loadingTimer = pauseableTimer(() => showLoading(), options.loadingDelay, {
      timerType: 'setTimeout',
      immediate: false,
    })

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
      const middleware = configMiddleware
        .filter((mw) => isFunction(mw.handler))
        .map((mw) => {
          return (ctx, next) => {
            if (isCanceled()) return
            return mw.handler!(ctx, next)
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

      // handle error
      const errorHandler = async (err: unknown) => {
        const error = ensureError(err)
        await hooks.callHook('error', error, context)
      }

      // create cleanup
      const cleanup = () => {
        // "isCurrentContext(context)" must be "true"
        if (isCurrentContext(context)) {
          loadingTimer.pause()
          closeLoading()
        }
        context = null as any
      }

      try {
        if (!loadingTimer.isActive() && !state.loading)
          options.loadingDelay > 0 ? loadingTimer.resume() : loadingTimer.flush()

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
        loadingTimer.pause()
        closeLoading(true)
        currentContext = null
      }
    }

    function run(...args) {
      return basicContext.executor(...args).then(() => state.data)
    }

    function refresh() {
      return run(...state.params)
    }

    // init middleware
    configMiddleware.forEach((mw) => mw.setup?.(basicContext))

    // automatic execute
    if (!options.manual) result.run(...(options.defaultParams || []))

    return result
  }

  return request as BasicRequest
}
