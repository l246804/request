/* eslint-disable @typescript-eslint/indent */
import type { Recordable } from 'types/utils'

export const freeze = Object.freeze

export const assign = Object.assign

export const toEntries = Object.entries

export const fromEntries = Object.fromEntries

export const keysOf = Object.keys

export const getOwnSymbols = Object.getOwnPropertySymbols

export function pick<T extends object, K extends string = string>(o: T, keys: K[]) {
  type PickResult = K[] extends Array<infer A>
    ? [A] extends [keyof T]
      ? Pick<T, A>
      : Recordable
    : Recordable
  return fromEntries(toEntries(o || {}).filter(([k]) => keys.includes(k as K))) as PickResult
}

export function omit<T extends object, K extends keyof T = keyof T>(o: T, keys: K[]) {
  type OmitResult = K[] extends Array<infer A>
    ? [A] extends [keyof T]
      ? Omit<T, A>
      : Recordable
    : Recordable
  return fromEntries(toEntries(o || {}).filter(([k]) => !keys.includes(k as K))) as OmitResult
}
