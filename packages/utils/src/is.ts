import type { Fn, Nullish } from 'types/utils'

export const typeOf = (value) => Object.prototype.toString.call(value).slice(8, -1)

export const isArray = Array.isArray

export const isUndef = (value): value is Nullish => value == null

export const isBoolean = (value): value is boolean => typeof value === 'boolean'

export const isFunction = (value): value is Fn<any[], any> => typeof value === 'function'

export const isObject = (value): value is object => !isUndef(value) && typeof value === 'object'

export const isPlanObject = (value): value is object => typeOf(value) === 'Object'

export const isString = (value): value is string => typeOf(value) === 'String'

export const isNumber = (value): value is number => typeOf(value) === 'Number'

export function isError(value): value is Error {
  return (
    !isUndef(value) &&
    (typeOf(value) === 'Error' || value instanceof Error || ('name' in value && 'message' in value))
  )
}

export function isClient() {
  return typeof window !== 'undefined'
}
