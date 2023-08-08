/* eslint-disable unused-imports/no-unused-vars */
import { MiddlewareHelper, type MiddlewareStoreKey, type RequestMiddleware } from '@rhao/request'
import {
  assign,
  getVisibilityKeys,
  listenVisibilityChange,
  pauseableTimer,
  toValue,
} from '@rhao/request-utils'
import type { Fn, Getter, MaybeGetter } from 'types/utils'

export interface RequestRefreshOptions {
  /**
   * 窗口聚焦时自动刷新请求
   * @default false
   */
  whenFocus?: MaybeGetter<boolean>
  /**
   * 在页面隐藏时，是否继续轮询。如果设置为 false，在页面隐藏时会暂时停止轮询，页面重新显示时继续上次轮询
   * @default false
   */
  whenHidden?: MaybeGetter<boolean>
  /**
   * 浏览器恢复网络连接时自动刷新请求（通过 `navigator.onLine`）
   * @default false
   */
  whenReconnect?: MaybeGetter<boolean>
  /**
   * 浏览器离线时轮询（由 `navigator.onLine` 确定）
   * @default false
   */
  whenOffline?: MaybeGetter<boolean>
  /**
   * 自动刷新间隔，单位为毫秒。如果值大于 0，则启动轮询模式
   * @default 0
   */
  interval?: MaybeGetter<number>
  /**
   * 轮询错误重试次数。如果设置为 -1，则无限次
   *
   * ***注意：依赖于 `RequestRetry` 中间件，优先级高于 `retry.count`***
   *
   * @default -1
   */
  errorRetryCount?: MaybeGetter<number>
}

interface RefreshStore {
  initialed: boolean
  focusHandlers: Set<Fn>
  reconnectHandlers: Set<Fn>
  visibilityHandlers: Set<Fn<[hidden: boolean]>>
  dispose: Fn<[]>
}

const storeKey: MiddlewareStoreKey<RefreshStore> = Symbol('refresh')
const { init: initGlobalStore, get: getGlobalStore } = MiddlewareHelper.createGlobalStore(storeKey)

// 初始化
function init() {
  if (getGlobalStore()?.initialed) return

  const store = initGlobalStore({
    initialed: true,
    focusHandlers: new Set<Fn>(),
    reconnectHandlers: new Set<Fn>(),
    visibilityHandlers: new Set<Fn<[hidden: boolean]>>(),
    dispose: () => {},
  })
  RequestRefresh.dispose = store.dispose

  const focusCallback = () => {
    store.focusHandlers.forEach((fn) => fn())
  }
  const onlineCallback = () => {
    store.reconnectHandlers.forEach((fn) => navigator.onLine && fn())
  }

  window.addEventListener('focus', focusCallback)
  window.addEventListener('online', onlineCallback)

  const unListen = listenVisibilityChange((hidden) => {
    store.visibilityHandlers.forEach((fn) => fn(hidden))
  })

  store.dispose = () => {
    store.focusHandlers.clear()
    store.reconnectHandlers.clear()
    store.visibilityHandlers.clear()

    window.removeEventListener('focus', focusCallback)
    window.removeEventListener('online', onlineCallback)
    unListen()

    store.dispose = () => {}
  }
}

RequestRefresh.dispose = () => {}

export function RequestRefresh(initialOptions?: Omit<RequestRefreshOptions, 'interval'>) {
  init()

  const middleware: RequestMiddleware = {
    priority: -999,
    setup: (ctx) => {
      const store = getGlobalStore()!

      // 合并配置项
      const options = assign(
        {
          whenFocus: false,
          whenHidden: false,
          whenReconnect: false,
          whenOffline: false,
          errorRetryCount: -1,
        } as RequestRefreshOptions,
        initialOptions,
        { interval: 0 },
        ctx.getOptions().refresh,
      ) as RequestRefreshOptions

      const refresh = ctx.getResult().refresh

      // 创建轮询状态
      let polling = false
      ctx.isPolling = () => polling

      // 创建计时器
      const timer = pauseableTimer(refresh, options.interval, {
        timerType: 'setTimeout',
        immediate: false,
      })
      const immediateResume = () => {
        polling = true
        refresh()
      }
      const resumeTimer = () => {
        if (!navigator.onLine && !toValue(options.whenOffline)) {
          polling = false
          return
        }

        polling = true
        timer.resume()
      }
      const pauseTimer = () => {
        polling = false
        timer.pause()
      }

      // 注册获焦、网络重连事件
      ctx.hooks.hook('before', () => {
        if (toValue(options.whenFocus)) store.focusHandlers.add(refresh)
        else store.focusHandlers.delete(refresh)

        if (toValue(options.whenReconnect)) store.reconnectHandlers.add(refresh)
        else store.reconnectHandlers.delete(refresh)
      })

      // 释放资源
      ctx.hooks.hookOnce('dispose', () => {
        store.focusHandlers.delete(refresh)
        store.reconnectHandlers.delete(refresh)
      })

      // ====================================轮询====================================
      const isDisabled = () => !(toValue(options.interval!) > 0)

      // 注册页面显示/隐藏事件
      const { hidden: hiddenKey } = getVisibilityKeys()
      const visibilityHandler = (hidden: boolean) => {
        if (toValue(options.whenHidden!)) return
        if (hidden) {
          pauseTimer()
        } else {
          // 页面显示时立即轮询
          immediateResume()
        }
      }

      const addListen = () => store.visibilityHandlers.add(visibilityHandler)
      const removeListen = () => store.visibilityHandlers.delete(visibilityHandler)

      ctx.hooks.hook('before', () => {
        if (isDisabled()) return
        addListen()
      })
      // @ts-expect-error
      ctx.hooks.hook('retry:fail', () => {
        if (isDisabled()) return
        removeListen()
      })
      ctx.hooks.hook('cancel', () => {
        if (isDisabled()) return
        pauseTimer()
        removeListen()
      })
      ctx.hooks.hook('success', () => {
        if (isDisabled()) return
        if (!toValue(options.whenHidden) && document[hiddenKey]) return
        resumeTimer()
      })
      ctx.hooks.hookOnce('dispose', () => {
        pauseTimer()
        removeListen()
      })

      // 覆盖 `retry.count`
      ctx.mutateOptions({
        retry: {
          // @ts-expect-error
          ...(ctx.getOptions().retry || {}),
          count: options.errorRetryCount,
        },
      })
    },
  }

  return middleware
}

declare module '@rhao/request' {
  interface RequestCustomOptions<TData, TParams extends unknown[] = unknown[]> {
    refresh?: RequestRefreshOptions
  }

  interface RequestCustomBasicContext<TData, TParams extends unknown[] = unknown[]> {
    isPolling: Getter<boolean>
  }
}
