import type { Fn, MaybeGetter } from '@rhao/request-types'
import { isClient, isNumber, toValue } from '.'

export interface PauseableTimerOptions {
  immediate?: boolean
  immediateCallback?: boolean
  timerType?: 'setTimeout' | 'setInterval' | 'requestAnimationFrame'
}

export function pauseableTimer<T extends Fn>(
  callback: T,
  ms: MaybeGetter<number> = 0,
  options: PauseableTimerOptions = {},
) {
  const { immediate = true, immediateCallback = false, timerType = 'setInterval' } = options

  let timer, timerFn: Fn, clearTimerFn: Fn
  switch (timerType) {
    case 'requestAnimationFrame':
      timerFn = requestAnimationFrame
      clearTimerFn = cancelAnimationFrame
      break
    case 'setTimeout':
      timerFn = setTimeout
      clearTimerFn = clearTimeout
      break
    case 'setInterval':
    default:
      timerFn = setInterval
      clearTimerFn = clearInterval
      break
  }

  let active = false
  const isActive = () => active

  const _callback = () => {
    callback()
    if (timerType === 'setTimeout') active = false
    if (timerType === 'requestAnimationFrame') resume()
  }

  const clean = () => {
    if (timer) {
      clearTimerFn(timer)
      timer = null
    }
  }

  function resume() {
    const msValue = toValue(ms)
    if (timerType !== 'requestAnimationFrame')
      if (!isNumber(msValue) || Number.isNaN(msValue) || msValue < 0) return

    active = true
    if (immediateCallback) callback()

    clean()
    timer = timerFn(_callback, msValue)
  }

  function pause() {
    active = false
    clean()
  }

  function flush() {
    active = true
    clean()
    callback()
    active = false
  }

  if (immediate && isClient()) resume()

  return { isActive, resume, pause, flush }
}
