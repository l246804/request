/* eslint-disable unused-imports/no-unused-vars */
import { type RequestMiddleware } from '@rhao/request'
import { pauseableTimer, toValue } from '@rhao/lodash-x'
import type { Fn, Getter, MaybeGetter } from '@rhao/types-base'
import { assign, once, pick } from 'lodash-unified'

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
   * ***注意：依赖于 `RequestRetry` 中间件，开启轮询时会默认设置 `retry.count`，优先级低于手动设置***
   *
   * @default -1
   */
  errorRetryCount?: MaybeGetter<number>
}

let focusHandlers: Set<Fn>
let reconnectHandlers: Set<Fn>
let visibilityHandlers: Set<Fn<[hidden: boolean]>>
RequestRefresh.dispose = () => {}

let init = once(_init)
function _init() {
  focusHandlers = new Set()
  reconnectHandlers = new Set()
  visibilityHandlers = new Set()

  const focusCallback = () => {
    focusHandlers.forEach((fn) => fn())
  }
  const onlineCallback = () => {
    reconnectHandlers.forEach((fn) => navigator.onLine && fn())
  }
  const visibilitychangeCallback = () => {
    visibilityHandlers.forEach((fn) => fn(document.hidden))
  }

  window.addEventListener('focus', focusCallback)
  window.addEventListener('online', onlineCallback)
  document.addEventListener('visibilitychange', visibilitychangeCallback)

  RequestRefresh.dispose = () => {
    focusHandlers.clear()
    reconnectHandlers.clear()
    visibilityHandlers.clear()

    window.removeEventListener('focus', focusCallback)
    window.removeEventListener('online', onlineCallback)
    document.removeEventListener('visibilitychange', visibilitychangeCallback)

    focusHandlers = null as any
    reconnectHandlers = null as any
    visibilityHandlers = null as any
    RequestRefresh.dispose = () => {}

    init = once(_init)
  }
}

export function RequestRefresh(initialOptions?: Pick<RequestRefreshOptions, 'errorRetryCount'>) {
  init()

  const middleware: RequestMiddleware = {
    priority: -999,
    setup: (ctx) => {
      // 合并配置项
      const options = assign(
        {
          whenFocus: false,
          whenHidden: false,
          whenReconnect: false,
          whenOffline: false,
          interval: 0,
          errorRetryCount: -1,
        } as RequestRefreshOptions,
        pick(initialOptions, ['errorRetryCount']),
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
        if (toValue(options.whenFocus)) focusHandlers.add(refresh)
        else focusHandlers.delete(refresh)

        if (toValue(options.whenReconnect)) reconnectHandlers.add(refresh)
        else reconnectHandlers.delete(refresh)
      })

      // 释放资源
      ctx.hooks.hookOnce('dispose', () => {
        focusHandlers.delete(refresh)
        reconnectHandlers.delete(refresh)
      })

      // ====================================轮询====================================
      const isDisabled = () => !(toValue(options.interval!) > 0)

      // 注册页面显示/隐藏事件
      const visibilityHandler = (hidden: boolean) => {
        if (toValue(options.whenHidden!)) return
        if (hidden) {
          pauseTimer()
        }
        else {
          // 页面显示时立即轮询
          immediateResume()
        }
      }

      const addListen = () => visibilityHandlers.add(visibilityHandler)
      const removeListen = () => visibilityHandlers.delete(visibilityHandler)

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
        if (!toValue(options.whenHidden) && document.hidden) return
        resumeTimer()
      })
      ctx.hooks.hookOnce('dispose', () => {
        pauseTimer()
        removeListen()
      })

      ctx.hooks.hook('before', () => {
        if (isDisabled()) return

        ctx.mutateOptions({
          // @ts-expect-error
          retry: assign({ count: options.errorRetryCount }, ctx.getOptions().retry),
        })
      })
    },
  }

  return middleware
}

declare module '@rhao/request' {
  interface RequestOptions<TData, TParams extends unknown[] = unknown[]> {
    refresh?: RequestRefreshOptions
  }

  interface RequestBasicContext<TData, TParams extends unknown[] = unknown[]> {
    isPolling: Getter<boolean>
  }
}
