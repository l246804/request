/* eslint-disable unused-imports/no-unused-vars */
import type { RequestMiddleware } from '@rhao/request'
import {
  assign,
  getVisibilityKeys,
  listenVisibilityChange,
  pauseableTimer,
  toValue,
} from '@rhao/request-utils'
import type { Fn, Getter, MaybeGetter } from 'types/utils'

export interface RequestPollingOptions {
  /**
   * 窗口聚焦时自动刷新请求
   * @default true
   */
  whenFocus?: boolean
  /**
   * 在页面隐藏时，是否继续轮询。如果设置为 false，在页面隐藏时会暂时停止轮询，页面重新显示时继续上次轮询
   * @default false
   */
  whenHidden?: boolean
  /**
   * 浏览器恢复网络连接时自动刷新请求（通过 `navigator.onLine`）
   * @default true
   */
  whenReconnect?: boolean
  /**
   * 浏览器离线时轮询（由 `navigator.onLine` 确定）
   * @default false
   */
  whenOffline?: boolean
  /**
   * 自动刷新间隔，单位为毫秒。如果值大于 0，则启动轮询模式
   * @default 0
   */
  interval?: number
  /**
   * 轮询错误重试次数。如果设置为 -1，则无限次
   * @default -1
   */
  errorRetryCount?: MaybeGetter<number>
}

RequestPolling._initialed = false
RequestPolling.refreshFns = new Set<Fn>()
RequestPolling.visibilityHandlers = new Set<Fn>()

RequestPolling.callRefresh = () => {
  RequestPolling.refreshFns.forEach((fn) => fn())
}

RequestPolling.dispose = () => {}

export function RequestPolling(initialOptions?: Omit<RequestPollingOptions, 'interval'>) {
  // 初始化
  if (!RequestPolling._initialed) {
    RequestPolling._initialed = true

    const callRefresh = RequestPolling.callRefresh

    window.addEventListener('focus', callRefresh)
    window.addEventListener('online', callRefresh)

    const unListen = listenVisibilityChange((hidden) => {
      RequestPolling.visibilityHandlers.forEach((fn) => fn(hidden))
    })

    RequestPolling.dispose = () => {
      RequestPolling.refreshFns.clear()
      RequestPolling.visibilityHandlers.clear()

      window.removeEventListener('focus', callRefresh)
      window.removeEventListener('online', callRefresh)

      unListen()

      RequestPolling.dispose = () => {}
    }
  }

  const middleware: RequestMiddleware = {
    priority: -999,
    setup: (ctx) => {
      let polling = false
      ctx.mutateResult({ isPolling: () => polling })

      // 合并配置项
      const options = assign(
        {
          whenFocus: true,
          whenHidden: false,
          whenReconnect: true,
          whenOffline: false,
          errorRetryCount: -1,
        } as RequestPollingOptions,
        initialOptions,
        { interval: 0 },
        ctx.getOptions().polling,
      ) as RequestPollingOptions

      const refresh = ctx.getResult().refresh

      // 注册刷新事件
      if (options.whenFocus || options.whenReconnect) {
        ctx.hooks.hookOnce('before', () => {
          RequestPolling.refreshFns.add(refresh)
        })
      }
      ctx.hooks.hookOnce('dispose', () => {
        RequestPolling.refreshFns.delete(refresh)
      })

      // 禁用轮询
      if (!options.interval) return

      // 创建计时器
      const timer = pauseableTimer(refresh, options.interval, {
        timerType: 'setTimeout',
        immediate: false,
      })

      const resume = () => {
        polling = true
        timer.resume()
      }
      const pause = () => {
        polling = false
        timer.pause()
      }

      // 注册页面显示/隐藏事件
      const { hidden: hiddenKey } = getVisibilityKeys()
      const visibilityHandler = (hidden: boolean) => {
        if (toValue(options.whenHidden!)) return
        if (hidden) {
          pause()
        } else {
          // 页面显示时立即轮询
          polling = true
          refresh()
        }
      }
      const addListen = () => RequestPolling.visibilityHandlers.add(visibilityHandler)
      const removeListen = () => RequestPolling.visibilityHandlers.delete(visibilityHandler)

      ctx.hooks.hook('before', addListen)
      ctx.hooks.hook('cancel', () => {
        removeListen()
        pause()
      })

      // 包装恢复函数
      const handleResume = () => {
        // 页面隐藏且 "whenHidden" 为 "false" 时停止轮询
        if (!toValue(options.whenHidden!) && document[hiddenKey]) pause()
        else resume()
      }

      // 处理错误重试
      let count = 0
      const cleanAndResume = () => {
        // 清除次数记录
        count = 0
        handleResume()
      }

      ctx.hooks.hook('success', () => {
        cleanAndResume()
      })

      ctx.hooks.hook('error', () => {
        const retryCount = toValue(options.errorRetryCount!)
        if (retryCount === -1) return cleanAndResume()
        if (count < retryCount) {
          count++
          handleResume()
        } else {
          // 达到指定次数时清除页面监听
          removeListen()
        }
      })
    },
  }

  return middleware
}

declare module '@rhao/request' {
  interface RequestCustomOptions<TData, TParams extends unknown[] = unknown[]> {
    polling?: RequestPollingOptions
  }

  interface RequestCustomResult<TData, TParams extends unknown[] = unknown[]> {
    isPolling: Getter<boolean>
  }
}
