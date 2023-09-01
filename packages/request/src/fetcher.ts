import type { AwaitableFn } from '@rhao/types-base'

export type RequestFetcher<TData, TParams extends unknown[] = unknown[]> = AwaitableFn<
  TParams,
  TData
>
