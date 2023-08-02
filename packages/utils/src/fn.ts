import type { Fn, MaybeFn, Nullable } from 'types/utils'
import { isFunction, isUndef } from './is'
import { assign } from './object'

export function createTimer<T extends Fn<any[], any>>(fn: T, ms?: Nullable<number>) {
  let timer: Nullable<ReturnType<typeof setTimeout>>

  function get() {
    return timer
  }

  function start() {
    clear()
    if (isUndef(ms)) fn()
    else timer = setTimeout(fn, ms)
  }

  function clear() {
    clearTimeout(timer!)
    timer = null
  }

  return {
    get,
    start,
    clear,
  }
}

export function toValue<
  T extends MaybeFn<any, any[]>,
  Args extends any[] = T extends Fn<infer A> ? A : [],
>(v: T, ...args: Args): T extends Fn<any[], infer R> ? R : T {
  return isFunction(v) ? v(...args) : v
}

export interface CreateSwitchOptions<T = boolean, F extends Fn<any[]> = Fn<any[]>> {
  initialState?: T
  openState?: T
  closeState?: T
  onToggle: Fn<[state: T, ...args: Parameters<F>]>
}
export function createSwitch<T = boolean, F extends Fn<any[]> = Fn<any[]>>(
  options?: CreateSwitchOptions<T, F>,
) {
  const { initialState, closeState, openState, onToggle } = assign(
    { initialState: false, closeState: false, openState: true },
    options,
  )
  let state = initialState

  function read() {
    return state
  }

  function toggle(...args: Parameters<F>) {
    state = state === closeState ? openState : closeState
    onToggle?.(state, ...args)
  }

  function revert() {
    state = initialState
  }

  return {
    read,
    toggle,
    revert,
  }
}
