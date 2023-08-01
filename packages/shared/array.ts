import { isArray } from './is'

export const ensureArray = <T>(value: T | T[]) => isArray(value) ? value : [value] as T extends Array<infer A> ? A[] : T[]

export const unique = <T>(value: T[]) => [...new Set(value)]
