/* eslint-disable unused-imports/no-unused-vars */
import { type RequestMiddleware, type RequestState, createState } from '@rhao/request'
import { reactive, toRefs, watch } from 'vue-demi'
import type { Ref, WatchSource } from 'vue-demi'
import { tryOnScopeDispose, tryOnUnmounted } from '@vueuse/core'
import { assign, omit } from 'lodash-unified'

export function RequestVue() {
  const middleware: RequestMiddleware = {
    priority: 1000,
    setup: (ctx) => {
      const { hooks, mutateResult, getOptions, getResult, dispose } = ctx
      const state = reactive(createState(getOptions()))

      hooks.hook('stateChange', (_state) => {
        assign(state, omit(_state, ['loading']))
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
      if (!tryOnScopeDispose(dispose)) tryOnUnmounted(dispose)
    },
  }

  return middleware
}

declare module '@rhao/request' {
  interface RequestOptions<TData, TParams extends unknown[] = unknown[]> {
    refreshDeps?: WatchSource | WatchSource[]
  }

  interface RequestResult<TData, TParams extends unknown[] = unknown[]> {
    data: Ref<RequestState<TData, TParams>['data']>
    params: Ref<RequestState<TData, TParams>['params']>
    loading: Ref<RequestState<TData, TParams>['loading']>
    error: Ref<RequestState<TData, TParams>['error']>
  }
}
