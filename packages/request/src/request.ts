import {
  assign,
  createSwitch,
  ensureError,
  isFunction,
  pauseablePromise,
  toValue,
  unique,
} from '@rhao/request-utils'
import type { RequestBasicOptions, RequestOptions } from './options'
import { createCounter } from './counter'
import type { RequestResult } from './result'
import type { RequestFetcher } from './fetcher'
import { type RequestBasicContext, type RequestContext, createMutateState } from './context'
import { compose } from './compose'
import type { RequestState } from './state'
import { createHooks } from './hooks'
import { normalizeMiddleware } from './middleware'
import { RequestLoading } from './loading'
import { RequestError } from './error'

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
   * `request()`
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
    const result = {
      getKey: () => key,
      getState: () => assign({}, state),
      cancel,
      run,
      refresh,
    } as RequestResult<any, any[]>

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
      mutateState: createMutateState(state, () => basicContext),
      mutateResult: (res) => {
        assign(result, res)
      },
    }

    // latest context
    let latestContext: RequestContext<any, any[]> | null = null

    // merge middleware
    const configMiddleware = normalizeMiddleware(
      [RequestLoading(), RequestError()].concat(request.options.middleware, opts?.middleware || []),
    )

    // register hooks
    const configHooks = unique(request.options.hooks.slice(0).concat(opts?.hooks || []))
    configHooks.forEach((configHook) => hooks.addHooks(configHook))

    // create executor
    async function executor(...params) {
      // if "ready" is false, do nothing
      if (!toValue(options.ready, params)) return

      // create pauseable promise
      const { promise, resolve } = pauseablePromise()

      // create switch of cancel
      const { read: isCanceled, toggle } = createSwitch()
      const cancel = (silent = false) => {
        if (isCanceled()) return
        toggle(true)
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        !silent && hooks.callHook('cancel', context.getState(), context)
        resolve(undefined)
      }

      // create context
      let context: RequestContext<any, any[]> = {
        ...basicContext,
        isLatestExecution: () => !!latestContext && context === latestContext,
        isCanceled,
        cancel,
      }
      latestContext = context

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
      async function next() {
        const data = await Promise.race([promise, context.fetcher(...state.params)])
        if (isCanceled()) return
        context.mutateState({ data })
      }

      // handle error
      const errorHandler = async (err: unknown) => {
        const error = ensureError(err)
        await hooks.callHook('error', error, context)
      }

      // dispose source
      const dispose = async () => {
        hooks.callHookSync('dispose', context)
        if (context.isLatestExecution()) latestContext = null
        context = null as any
      }
      try {
        context.mutateState({ params, error: undefined })

        await hooks.callHook('before', state.params, context)
        if (isCanceled()) return

        await applyMiddleware(context, next)

        if (isCanceled()) return
        await hooks.callHook('success', state.data, context)
      } catch (err: unknown) {
        await errorHandler(err)
      } finally {
        isCanceled() && dispose()
      }

      try {
        await hooks.callHook('after', context.getState(), context)
      } catch (err: unknown) {
        await errorHandler(err)
      } finally {
        dispose()
      }
    }

    function cancel() {
      if (latestContext) latestContext.cancel()
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
