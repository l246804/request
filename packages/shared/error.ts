import { isError } from './is'

export function ensureError(err: unknown) {
  return isError(err) ? err : new Error(String(err))
}
