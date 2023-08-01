import type { Hookable, NestedHooks } from 'hookable'
import { createHooks } from 'hookable'
import { assign, keysOf } from 'shared/object'
import { createSwitch, createTimer, toValue } from 'shared/fn'
import { isString } from 'shared/is'
import { ensureArray } from 'shared/array'
import { ensureError } from 'shared/error'
import type { RequestBasicOptions, RequestOptions } from './options'
import { type RequestHooks, syncSerialTaskCaller } from './hooks'
import { createCounter } from './counter'
import type { RequestResult } from './result'
import type { RequestFetcher } from './fetcher'
import type { RequestBasicContext, RequestContext } from './context'
import { createLoadingController } from './loading-controller'
import type { RequestMiddleware } from './middleware'
import { compose } from './compose'
import type { RequestState } from './state'

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
   * 全局中间件
   */
  middleware: RequestMiddleware[]

  /**
   * `hooks` 管理器
   */
  hooks: Hookable<RequestHooks>

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

  request.middleware = request.options.middleware

  request.hooks = createHooks<RequestHooks>()
  request.options.hooks.filter(Boolean).forEach(request.hooks.addHooks)

  function request(fetcher: RequestFetcher<any, any[]>, opts?: RequestOptions<any, any[]>) {
    // merge options
    const options = assign({ ready: true } as RequestOptions<any, any[]>, request.options, opts)
    const key = options.keyGenerator()

    // merge middleware
    const middleware = ([] as RequestMiddleware<any>[])
      .concat(request.middleware, opts?.middleware || [])
      .filter(Boolean)

    // one-time hooks
    const onceHooks = ensureArray(opts?.hooks).filter(Boolean) as NestedHooks<
      RequestHooks<any, any[]>
    >[]

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
      hooks: request.hooks,
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
        basicContext.hooks.callHook('stateChange', mutatedValue)
      },
      mutateResult: (fn) => {
        assign(result, fn(result))
      },
    }

    let currentContext: RequestContext<any, any[]> | null = null

    // create loading-controller
    const { show: showLoading, close: closeLoading } = createLoadingController((loading) => {
      basicContext.hooks.callHookWith(
        syncSerialTaskCaller,
        'loading',
        loading,
        currentContext as any,
      )
    })

    // create executor
    async function executor(...params) {
      // if "ready" is false, do nothing
      if (!toValue(options.ready, params)) return

      // register one-time hooks
      const fns = onceHooks.map(request.hooks.addHooks)
      const rmFn = () => fns.forEach((fn) => fn())

      // create switch of cancel
      const { read: isCanceled, toggle } = createSwitch()
      const cancel = (silent = false) => {
        if (isCanceled()) return
        toggle(true)
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        !silent && basicContext.hooks.callHook('cancel', context)
      }

      // create context
      const context: RequestContext<any, any[]> = {
        ...basicContext,
        isCanceled,
        cancel,
      }
      currentContext = context

      // if "isCanceled()" is "true", returns
      const wrappedMiddleware = middleware.map((mw) => {
        return (ctx, next) => {
          if (ctx.isCanceled()) return
          return mw(ctx, next)
        }
      })

      // create "applyMiddleware"
      const applyMiddleware = compose(wrappedMiddleware)

      // applyMiddleware's next
      async function next() {
        if (isCanceled()) return
        const data = await context.fetcher()
        context.mutateState({ data })
        return data
      }

      // create loading timer
      const loadingTimer = createTimer(() => showLoading(), options.loadingDelay)

      // handle error
      const errorHandler = async (err: unknown) => {
        const error = ensureError(err)
        context.mutateState({ error })
        await context.hooks.callHook('error', error, context)
      }

      // create cleanup
      const cleanup = () => {
        loadingTimer.clear()
        closeLoading()
        rmFn()
        currentContext = null
      }

      try {
        loadingTimer.start()
        context.mutateState({ params, error: undefined })

        await context.hooks.callHook('before', state.params, context)
        if (isCanceled()) return

        await applyMiddleware(context, next)

        if (isCanceled()) return
        await context.hooks.callHook('success', state.data, context)
      } catch (err: unknown) {
        await errorHandler(err)
      } finally {
        isCanceled() && cleanup()
      }

      try {
        await context.hooks.callHook('after', context)
      } catch (err: unknown) {
        await errorHandler(err)
      } finally {
        cleanup()
      }
    }

    function cancel() {
      if (currentContext) {
        currentContext.cancel()
        closeLoading(true)
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
    middleware.forEach((mw) => mw.setup?.(basicContext))

    // automatic execute
    if (!options.manual) executor(...(options.defaultParams || []))

    return result
  }

  return request as BasicRequest
}
