/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable unused-imports/no-unused-vars */
import type { Recordable } from '@rhao/types-base'

export interface StoreKey<T extends Recordable> extends Symbol {}

export type InferStore<K extends StoreKey<any>> = K extends StoreKey<infer T> ? T : Recordable

export function createStore() {
  let store: Record<symbol, Recordable> = {}

  function set(key: symbol, value: Recordable = {}) {
    store[key] = value
  }

  function get(key: symbol) {
    if (!store[key]) set(key)
    return store[key]
  }

  function clear() {
    store = {}
  }

  return { set, get, clear }
}
