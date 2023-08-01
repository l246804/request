<script setup lang="ts">
import type { AxiosResponse } from 'axios'
import type {
  BasicRequest,
  RequestFetcher,
  RequestOptions,
  RequestResult,
} from '../../packages/request/src'
import { createRequest } from '../../packages/request/src'

interface UseRequest extends BasicRequest {
  <TData, TParams extends unknown[] = unknown[]>(
    fetcher: RequestFetcher<TData, TParams>,
    options?: RequestOptions<TData extends AxiosResponse<infer D> ? D : TData, TParams>,
  ): RequestResult<TData extends AxiosResponse<infer D> ? D : TData, TParams>
}

const useRequest = createRequest({
  manual: true,
}) as UseRequest

function mockApi(type: 'success' | 'error') {
  return new Promise<AxiosResponse<number>>((resolve, reject) => {
    setTimeout(() => {
      if (type === 'success') resolve({ data: 123 } as AxiosResponse<number>)
      else reject(new Error('run failed!'))
    }, 3000)
  })
}
const { getState, run, cancel } = useRequest(mockApi, {
  hooks: {
    stateChange: (state) => {
      console.log('stateChange', state)
    },
    cancel: (ctx) => {
      console.log('cancel', ctx)
    },
    loadingChange: (loading, ctx) => {
      console.log('loading', loading, ctx)
    },
    before: (params, ctx) => {
      console.log('before', params, ctx)
    },
    success: (data, ctx) => {
      console.log('success:', data, ctx)
    },
    error: (e, ctx) => {
      console.log('error', e.message, ctx)
    },
    after: (ctx) => {
      console.log('after called', ctx)
    },
  },
})

getState().data?.toFixed(2)
</script>

<template>
  <ElContainer style="height: 100vh; overflow: hidden">
    <ElMain>
      <ElButton
        type="success"
        @click="run('success')"
      >
        模拟成功请求
      </ElButton>
      <ElButton
        type="danger"
        @click="run('error')"
      >
        模拟失败请求
      </ElButton>
      <ElButton
        type="primary"
        @click="cancel"
      >
        取消执行
      </ElButton>
    </ElMain>
  </ElContainer>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
