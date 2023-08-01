import { isArray, isFunction } from 'shared/is'
import type { RequestMiddleware } from './middleware'
import type { RequestContext } from './context'

/**
 * @see https://github.com/koajs/compose
 */
export function compose(middleware: RequestMiddleware<any>[]) {
  if (!isArray(middleware)) throw new TypeError('Middleware stack must be an array!')
  for (const fn of middleware)
    if (!isFunction(fn)) throw new TypeError('Middleware must be composed of functions!')

  let index = -1
  return function <TData, TParams extends unknown[]>(
    context: RequestContext<TData, TParams>,
    next: RequestMiddleware<TData>,
  ) {
    return dispatch(0)

    function dispatch(i: number) {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
      index = i
      let fn = middleware[i]

      if (i === middleware.length) fn = next
      if (!fn) return Promise.resolve()

      try {
        return Promise.resolve(fn(context as any, dispatch.bind(null, i + 1)))
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
}
