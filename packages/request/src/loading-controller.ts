import type { Fn, Getter } from 'types/utils'

export function createLoadingController(
  loading: Getter<boolean>,
  onToggle: Fn<[loading: boolean]>,
) {
  function show() {
    if (!loading()) onToggle?.(true)
  }

  function close(force = false) {
    if (force || loading()) onToggle?.(false)
  }

  return { show, close }
}
