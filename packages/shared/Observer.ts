import type { Fn } from 'types/utils'

export class Observer<T extends unknown[]> {
  private callback: Fn<T>

  constructor(callback: Fn<T>) {
    this.callback = callback
  }

  update(...args: T) {
    this.callback(...args)
  }
}
