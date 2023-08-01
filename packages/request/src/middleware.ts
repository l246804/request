import type { PromiseFn } from 'types/utils'
import type { RequestBasicContext, RequestContext } from './context'

export interface RequestMiddleware<TData = any> {
  /**
   * 安装中间件时触发，可设置 `request()` 返回结果
   */
  setup?: (context: RequestBasicContext<TData, any[]>) => void

  /**
   * 中间件具体操作
   */
  (context: RequestContext<TData, any[]>, next: PromiseFn): void
}
