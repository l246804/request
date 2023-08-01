import type { AwaitableFn, Fn } from 'types/utils'
import type { HookCallback } from 'hookable'
import type { RequestContext } from './context'
import type { RequestState } from './state'

export interface RequestCustomHooks {}

export interface RequestHooks<TData = any, TParams extends unknown[] = unknown[]> {
  /**
   * 执行 `fetcher()` 前触发
   */
  before: AwaitableFn<[TParams, RequestContext<TData, TParams>]>

  /**
   * 执行 `fetcher()` 成功时触发
   */
  success: AwaitableFn<[TData, RequestContext<TData, TParams>]>

  /**
   * 执行 `fetcher()` 错误时触发
   */
  error: AwaitableFn<[Error, RequestContext<TData, TParams>]>

  /**
   * 执行 `fetcher()` 后触发，同 `Promise.finally`
   */
  after: AwaitableFn<[RequestContext<TData, TParams>]>

  /**
   * 执行 `fetcher()` 取消时触发
   */
  cancel: AwaitableFn<[RequestContext<TData, TParams>]>

  /**
   * 请求状态变更时触发，多次并发调用仅在初次和所有请求结束后触发
   */
  loading: Fn<[boolean, RequestContext<TData, TParams>]>

  /**
   * 状态变更时触发，参数为本次变更的状态
   */
  stateChange: AwaitableFn<[Partial<RequestState<TData, TParams>>]>
}

const defaultTask = { run: (function_: HookCallback) => function_() }
const _createTask = () => defaultTask
function createTask() {
  // @ts-expect-error
  // eslint-disable-next-line no-console
  return typeof console.createTask !== 'undefined' ? console.createTask : _createTask
}

export function syncSerialTaskCaller<
  T extends HookCallback = HookCallback,
  P extends unknown[] = Parameters<HookCallback>,
>(hooks: T[], args: P) {
  const name = args.shift()
  // @ts-expect-error
  const task = createTask(name)
  return hooks.forEach((hookFunction) => task.run(() => hookFunction(...args)))
}
