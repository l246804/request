import type { Fn } from 'types/utils'

export type RequestFetcher<TData, TParams extends unknown[] = unknown[]> = Fn<TParams, TData>
