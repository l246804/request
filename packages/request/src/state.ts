import type { Nullish } from 'types/utils'

/**
 * request state
 */
export interface RequestState<TData, TParams extends unknown[] = unknown[]> {
  /**
   * 执行时的参数
   */
  params: TParams
  /**
   * 执行后的数据
   */
  data: TData | Nullish
  /**
   * 执行失败后的错误
   */
  error: Error | Nullish
  /**
   * 是否正在执行，多次执行仅会在初次和全部执行结束后触发更新
   */
  loading: boolean
}
