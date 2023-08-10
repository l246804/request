import type { Fn } from '@rhao/request-types'

export function getVisibilityKeys() {
  let hidden: string, visibilityChange: string
  // @ts-expect-error
  if (typeof document.msHidden !== 'undefined') {
    hidden = 'msHidden'
    visibilityChange = 'msvisibilitychange'
    // @ts-expect-error
  } else if (typeof document.webkitHidden !== 'undefined') {
    hidden = 'webkitHidden'
    visibilityChange = 'webkitvisibilitychange'
  } else {
    // Opera 12.10 and Firefox 18 and later support
    hidden = 'hidden'
    visibilityChange = 'visibilitychange'
  }
  return {
    hidden,
    event: visibilityChange,
  }
}

export function listenVisibilityChange(callback: Fn<[hidden: boolean, event: Event]>) {
  const { hidden, event } = getVisibilityKeys()
  const handler = (e) => callback(document[hidden] as boolean, e)
  document.addEventListener(event, handler)
  return () => document.removeEventListener(event, handler)
}

export function isOnline() {
  return navigator.onLine
}
