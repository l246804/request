import {
  assign,
  createSwitch,
  ensureArray,
  ensureError,
  isFunction,
  omit,
  pauseablePromise,
  toValue,
  unique,
} from '@rhao/request-utils'
import {
  type RequestBasicOptions,
  type RequestOptions,
  normalizeBasicOptions,
  normalizeOptions,
} from './options'
import { createCounter } from './counter'
import type { RequestResult } from './result'
import type { RequestFetcher } from './fetcher'
import { type RequestBasicContext, type RequestContext, createMutateState } from './context'
import { compose } from './compose'
import { createState } from './state'
import { createHooks } from './hooks'
import { normalizeMiddleware } from './middleware'
import { RequestLoading } from './loading'
import { RequestError } from './error'
import { createPendingHelper } from './pending'
import { createTempData } from './temp-data'

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
  request.options = normalizeBasicOptions(request as BasicRequest, options)

  function request(fetcher: RequestFetcher<any, any[]>, opts?: RequestOptions<any, any[]>) {
    let options = normalizeOptions(request as BasicRequest, opts)
    const key = options.key || options.keyGenerator() || `__request__${request.counter.next()}`
    let hooks = createHooks()

    // 创建 `state`
    const state = createState(options)

    // 创建 `result`
    const result = {
      getKey: () => key,
      getState: () => assign({}, state),
      cancel,
      run,
      refresh,
    } as RequestResult<any, any[]>

    // 创建 `pending` 辅助函数
    const { hasPending, hooks: pendingHooks } = createPendingHelper()

    // 创建基础的上下文
    let basicContext: RequestBasicContext<any, any[]> = {
      request: request as any,
      hooks,
      fetcher,
      executor,
      hasPending,
      getKey: () => key,
      getOptions: () => assign({}, options),
      getState: () => assign({}, state),
      getResult: () => assign({}, result),
      mutateState: createMutateState(state, () => basicContext),
      mutateResult: (res) => {
        assign(result, res)
      },
      dispose: () => {
        cancel()
        hooks.callHookSync('dispose', basicContext)
        hooks.removeAllHooks()

        options.middleware.length = 0
        options.hooks.length = 0
        options = {} as any
        hooks = null as any
        basicContext = {} as any
      },
    }

    // 保存最近一次上下文对象，用于手动调用 `cancel`
    let latestContext: RequestContext<any, any[]> | null = null

    // 合并中间件
    const configMiddleware = normalizeMiddleware(
      [RequestLoading(), RequestError()].concat(request.options.middleware, opts?.middleware || []),
    )

    // 合并且注册 `hooks`
    const configHooks = unique([
      pendingHooks,
      ...ensureArray(request.options.hooks),
      ...ensureArray(options.hooks),
    ])
    configHooks.forEach((configHook) => hooks.addHooks(configHook))

    // 包裹 `fetcher()` 的执行器
    async function executor(...params) {
      // 验证不通过则什么都不做
      if (!toValue(options.ready, params)) return
      if (toValue(options.single, params, state.params) && basicContext.hasPending()) return

      // 创建可中断的 `promise`，用于取消执行的 `fetcher()`
      const { promise, resolve } = pauseablePromise()

      // 创建取消开关
      const { read: isCanceled, toggle } = createSwitch()
      const cancel = (silent = false) => {
        if (isCanceled()) return
        toggle(true)
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        !silent && hooks.callHook('cancel', context.getState(), context)
        resolve(undefined)
      }

      // 创建执行器的上下文
      let context: RequestContext<any, any[]> = {
        ...omit(basicContext, ['mutateResult', 'dispose']),
        mutateData: (data) => {
          state.data = data
        },
        isLatestExecution: () => !!latestContext && context === latestContext,
        isCanceled,
        cancel,
      }
      // 设置最近一次上下文
      latestContext = context

      // 创建临时数据，避免频繁触发 `state.data` 更新
      const disposeTempData = createTempData(context)

      // 包裹中间件，在取消时直接返回
      const middleware = configMiddleware
        .filter((mw) => isFunction(mw.handler))
        .map((mw) => {
          return (ctx, next) => {
            if (isCanceled()) return
            return mw.handler!(ctx, next)
          }
        })

      // 创建中间件调用器
      const applyMiddleware = compose(middleware)
      async function next() {
        const data = await Promise.race([promise, context.fetcher(...state.params)])
        if (isCanceled()) return
        context.mutateData(await options.dataParser(data))
      }

      // 错误处理
      const errorHandler = async (err: unknown) => {
        const error = ensureError(err)
        await hooks.callHook('error', error, context)
      }

      // 释放资源
      const end = async () => {
        await disposeTempData()
        hooks.callHookSync('end', context)

        if (context.isLatestExecution()) latestContext = null
        context = null as any
      }

      try {
        context.mutateState({ params, error: undefined })
        if (!toValue(options.keepPreviousData)) context.mutateData(options.initData?.())

        await hooks.callHook('before', state.params, context)
        if (isCanceled()) return

        await applyMiddleware(context, next)

        if (isCanceled()) return
        await hooks.callHook('success', state.data, context)
      } catch (err: unknown) {
        await errorHandler(err)
      } finally {
        isCanceled() && end()
      }

      try {
        await hooks.callHook('after', context.getState(), context)
      } catch (err: unknown) {
        await errorHandler(err)
      } finally {
        end()
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