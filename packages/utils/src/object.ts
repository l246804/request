/* eslint-disable @typescript-eslint/indent */
import type { Recordable } from '@rhao/request-types'
import { isObject } from '.'

export const freeze = Object.freeze

export const assign = Object.assign

export function assignSymbols<T extends object>(o: T, ...sources): T {
  if (isObject(o)) {
    for (const source of sources) {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      const symbols = getOwnSymbols(source || {})
      for (const syb of symbols) o[syb] = source[syb]
    }
  }
  return o
}

export const toEntries = Object.entries

export const fromEntries = Object.fromEntries

export const keysOf = Object.keys

export const getOwnSymbols = Object.getOwnPropertySymbols

export function pick<T extends object, K extends keyof T | string = keyof T | string>(
  o: T,
  keys: K[],
) {
  type PickResult = K[] extends Array<infer A>
    ? [A] extends [keyof T]
      ? Pick<T, A>
      : Recordable
    : Recordable
  return fromEntries(toEntries(o || {}).filter(([k]) => keys.includes(k as K))) as PickResult
}

export function omit<T extends object, K extends keyof T | string = keyof T | string>(
  o: T,
  keys: K[],
) {
  type OmitResult = K[] extends Array<infer A>
    ? [A] extends [keyof T]
      ? Omit<T, A>
      : Recordable
    : Recordable
  return fromEntries(toEntries(o || {}).filter(([k]) => !keys.includes(k as K))) as OmitResult
}

export function mapKeys<T extends object>(
  o: T,
  callback: (value: any, key: string, object: T) => string,
) {
  return fromEntries(toEntries(o || {}).map(([key, value]) => [callback(value, key, o), value]))
}

export function mapValues<T extends object>(
  o: T,
  callback: (value: any, key: string, object: T) => any,
) {
  return fromEntries(toEntries(o || {}).map(([key, value]) => [key, callback(value, key, o)]))
}
