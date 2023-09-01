import { isArray, isFunction } from 'lodash-unified'
import type { RequestMiddlewareFunction } from './middleware'
import type { RequestContext } from './context'

/**
 * @see https://github.com/koajs/compose
 */
export function compose(middleware: RequestMiddlewareFunction<any>[]) {
  if (!isArray(middleware)) throw new TypeError('Middleware stack must be an array!')
  for (const fn of middleware)
    if (!isFunction(fn)) throw new TypeError('Middleware must be composed of functions!')

  let index = -1
  return function (context: RequestContext<any, any[]>, next: RequestMiddlewareFunction<any>) {
    return dispatch(0)

    function dispatch(i: number) {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
      index = i
      let fn = middleware[i]

      if (i === middleware.length) fn = next
      if (!fn || context.isCanceled()) return Promise.resolve()

      try {
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)))
      }
      catch (err) {
        return Promise.reject(err)
      }
    }
  }
}
