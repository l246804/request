import type { AwaitableFn } from 'types/utils'

export type RequestFetcher<TData, TParams extends unknown[] = unknown[]> = AwaitableFn<
  TParams,
  TData
>
