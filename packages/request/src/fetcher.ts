import type { AwaitableFn } from '@rhao/request-types'

export type RequestFetcher<TData, TParams extends unknown[] = unknown[]> = AwaitableFn<
  TParams,
  TData
>
