import type { Fn } from '@rhao/request-types'

export function pauseablePromise<T = any>() {
  let resolve: Fn<[T | PromiseLike<T>]>, reject: Fn<[reason?: any]>
  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })
  return {
    promise,
    // @ts-expect-error
    resolve,
    // @ts-expect-error
    reject,
  }
}
