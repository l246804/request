export type ValidKey = string | symbol

export type Recordable<T = any> = Record<ValidKey, T>

export type Awaitable<T = void> = Promise<T> | T

export type Fn<P extends any[] = [], R = void> = (...args: P) => R

export type EnsureFn<T> = [T] extends [Fn<any[], any>] ? T : Fn<[T], T>

export type MaybeFn<T, P extends any[] = []> = T | Fn<P, T>

export type MaybeArray<T> = T | T[]

export type PromiseFn<P extends any[] = [], R = void> = (...args: P) => Promise<R>

export type AwaitableFn<P extends any[] = [], R = void> = (...args: P) => Awaitable<R>

export type Getter<T> = () => T

export type MaybeGetter<T> = T | Getter<T>

export type Nullable<T> = T | null

export type Simplify<T> = {
  [K in keyof T]: T[K]
}

export type Nullish = null | undefined

export type DeepReadonly<T> = {
  readonly [K in keyof T]: DeepReadonly<T[K]>
}
