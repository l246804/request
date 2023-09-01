import { assign, castArray, omit, uniq } from 'lodash-unified'
import { castError, controllablePromise, createSwitch, toValue } from '@rhao/lodash-x'
import { type RequestBasicOptions, type RequestOptions, normalizeBasicOptions } from './options'
import type { RequestResult } from './result'
import type { RequestFetcher } from './fetcher'
import { type RequestBasicContext, type RequestContext, createMutateState } from './context'
import { compose } from './compose'
import { createState } from './state'
import { createHooks } from './hooks'
import { normalizeMiddleware } from './middleware'
import { createTempData } from './temp-data'
import { createStore } from './store'
import { createKeyManager } from './key-manager'
import { createPendingManager } from './pending-manager'

export interface BasicRequestHook {
  /**
   * 内置的 key 管理器
   */
  keyManager: ReturnType<typeof createKeyManager>

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
export function createRequestHook(options?: RequestBasicOptions) {
  const keyManager = createKeyManager()
  const normalizedOptions = normalizeBasicOptions(options)
  Object.defineProperties(request, {
    keyManager: {
      enumerable: true,
      get: () => keyManager,
    },
    options: {
      enumerable: true,
      get: () => normalizedOptions,
    },
  })

  function request(fetcher: RequestFetcher<any, any[]>, opts?: RequestOptions<any, any[]>) {
    let options = assign({}, normalizedOptions, opts)
    const key = options.key || options.keyGenerator() || keyManager.getNextKey()
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
    const {
      hasPending,
      configHooks: pendingConfigHooks,
      clearPending,
      clearPendingWithCancel,
    } = createPendingManager()

    // 创建数据中心
    const store = createStore()

    // 创建基础的上下文
    let basicContext = {
      request,
      hooks,
      fetcher,
      executor,
      hasPending,
      clearPending,
      clearPendingWithCancel,
      getKey: () => key,
      getOptions: () => assign({}, options),
      getState: () => assign({}, state),
      getResult: () => assign({}, result),
      mutateOptions: (opts) => {
        assign(options, opts)
      },
      mutateState: createMutateState(state, () => basicContext),
      mutateResult: (res) => {
        assign(result, res)
      },
      setStore: store.set,
      getStore: store.get,
      dispose: () => {
        toValue(options.cancelWhenDispose) && cancel()

        hooks.callHook('dispose', basicContext).finally(() => {
          hooks.removeAllHooks()
          store.clear()
          options = null as any
          hooks = null as any
          basicContext = null as any
        })
      },
    } as RequestBasicContext<any, any[]>

    // 保存最近一次上下文对象，用于手动调用 `cancel`
    let latestContext: RequestContext<any, any[]> | null = null

    // 合并中间件
    const configMiddleware = normalizeMiddleware([
      ...normalizedOptions.middleware,
      ...(opts?.middleware || []),
    ])

    // 合并且注册 `hooks`
    const configHooks = uniq([
      pendingConfigHooks,
      ...castArray(normalizedOptions.hooks),
      ...castArray(options.hooks),
    ])
    configHooks.forEach((configHook) => hooks.addHooks(configHook))

    // 包裹 `fetcher()` 的执行器
    async function executor(...params) {
      // 创建可中断的 `promise`，用于取消执行的 `fetcher()`
      const { promise, resolve } = controllablePromise()
      const promiseResult = Symbol('promiseResult')

      // 创建取消开关
      const [isCanceled, cancelControls] = createSwitch({ once: true })
      const cancel = (silent = false) => {
        if (isCanceled()) return

        cancelControls.open()
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        !silent && hooks.callHook('cancel', context.getState(), context)
        resolve(promiseResult)
      }

      // 创建失败开关
      const [isFailed, failedControls] = createSwitch({ once: true })

      // 创建执行器的上下文
      let context: RequestContext<any, any[]> = {
        ...omit(basicContext, ['mutateResult', 'dispose']),
        mutateData: (data) => {
          state.data = data
        },
        isLatestExecution: () => !!latestContext && context === latestContext,
        isFailed,
        isCanceled,
        cancel,
      }
      // 设置最近一次上下文
      latestContext = context

      // 创建临时数据，避免频繁触发 `state.data` 更新
      const disposeTempData = createTempData(context)

      // 返回中间件函数
      const middleware = configMiddleware.map((mw) => mw.handler!)

      // 创建中间件调用器
      const applyMiddleware = compose(middleware)
      async function next() {
        const data = await Promise.race([promise, context.fetcher(...state.params)])
        if (data === promiseResult) hooks.callHook('discarded', context)
        if (isCanceled()) return

        let finalData = await options.dataParser(data)
        if (options.dataCalibrator) finalData = options.dataCalibrator(finalData)
        context.mutateData(finalData)
      }

      // 错误处理
      const errorHandler = async (err: unknown) => {
        failedControls.open()
        const error = castError(err)
        await hooks.callHook('error', error, context)
      }

      // 释放资源
      const finallyHandler = async () => {
        disposeTempData()
        await hooks.callHook('finally', context)

        if (context.isLatestExecution()) latestContext = null
        context = null as any
      }

      try {
        await hooks.callHook('preface', params, context)
        if (isCanceled()) return

        context.mutateState({ params, error: undefined })
        if (!toValue(options.keepPreviousData)) context.mutateState({ data: options.initData?.() })

        await hooks.callHook('before', state.params, context)
        if (isCanceled()) return

        await applyMiddleware(context, next)

        if (isCanceled()) return
        await hooks.callHook('success', state.data, context)
      }
      catch (err: unknown) {
        await errorHandler(err)
      }
      finally {
        isCanceled() && (await finallyHandler())
      }

      try {
        await hooks.callHook('after', context.getState(), context)
      }
      catch (err: unknown) {
        await errorHandler(err)
      }
      finally {
        await finallyHandler()
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

    return result
  }

  return request as BasicRequestHook
}