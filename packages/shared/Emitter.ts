import type { Fn, ValidKey } from 'types/utils'
import { isFunction } from './is'

export interface BasicEvents {
  [K: ValidKey]: any[]
}

type Callback<T extends any[] = any[]> = Fn<T>
type GetCallback<T> = T extends any[] ? Callback<T> : T extends Callback ? T : Callback

export class Emitter<T extends BasicEvents> {
  private events = new Map<keyof T, Callback[]>()

  on<K extends keyof T, F extends Callback = GetCallback<T[K]>>(key: K, callback: F) {
    if (!isFunction(callback)) return
    const callbacks = this.events.get(key)
    if (!callbacks) this.events.set(key, [callback])
    else if (!callbacks.includes(callback)) callbacks.push(callback)
  }

  emit<K extends keyof T>(key: K, ...args: T[K]) {
    const callbacks = this.events.get(key)
    if (callbacks) callbacks.forEach(callback => callback(...args))
  }

  off<K extends keyof T, F extends Callback = GetCallback<T[K]>>(key: K, callback: F) {
    const callbacks = this.events.get(key)
    if (callbacks && callbacks.includes(callback as Callback))
      callbacks.splice(callbacks.indexOf(callback as Callback), 1)
  }

  once<K extends keyof T, F extends Callback = GetCallback<T[K]>>(key: K, callback: F) {
    const callbackFn: Callback = (...args) => {
      callback(...args)
      this.off(key, callbackFn)
    }
    this.on(key, callbackFn)
  }

  offAll<K extends keyof T>(key: K) {
    this.events.delete(key)
  }

  clear() {
    this.events.clear()
  }
}
