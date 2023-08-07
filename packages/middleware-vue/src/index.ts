/* eslint-disable unused-imports/no-unused-vars */
import { type RequestMiddleware, type RequestState, createState } from '@rhao/request'
import { assign } from '@rhao/request-utils'
import { reactive, toRefs, watch } from 'vue-demi'
import type { Ref, WatchSource } from 'vue-demi'
import { tryOnUnmounted } from '@vueuse/core'

export function RequestVue() {
  const middleware: RequestMiddleware = {
    priority: 1000,
    setup: (ctx) => {
      const { hooks, mutateResult, getOptions, getResult, dispose } = ctx
      const state = reactive(createState(getOptions()))

      hooks.hook('stateChange', (_state) => {
        assign(state, _state)
      })
      hooks.hook('loadingChange', (loading) => {
        state.loading = loading
      })

      // 增加自定义结果
      mutateResult(toRefs(state))

      // 注册依赖侦听器
      const { refreshDeps } = getOptions()
      if (refreshDeps) watch(refreshDeps, getResult().refresh)

      // 释放资源
      tryOnUnmounted(dispose)
    },
  }

  return middleware
}

declare module '@rhao/request' {
  interface RequestCustomOptions<TData, TParams extends unknown[] = unknown[]> {
    refreshDeps?: WatchSource | WatchSource[]
  }

  interface RequestCustomResult<TData, TParams extends unknown[] = unknown[]> {
    data: Ref<RequestState<TData, TParams>['data']>
    params: Ref<RequestState<TData, TParams>['params']>
    loading: Ref<RequestState<TData, TParams>['loading']>
    error: Ref<RequestState<TData, TParams>['error']>
  }
}
