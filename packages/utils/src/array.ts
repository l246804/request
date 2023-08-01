import { isArray } from './is'

export function ensureArray<T>(value: T | T[]) {
  return isArray(value) ? value : ([value] as T extends Array<infer A> ? A[] : T[])
}

export const unique = <T>(value: T[]) => [...new Set(value)]
