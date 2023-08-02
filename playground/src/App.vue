<script setup lang="ts">
import type { AxiosResponse } from 'axios'
import { computed } from 'vue'
import type {
  BasicRequest,
  RequestFetcher,
  RequestOptions,
  RequestResult,
} from '@rhao/request/index'
import { createRequest } from '@rhao/request/index'
import {
  RequestDebounce,
  RequestPolling,
  RequestThrottle,
} from '@rhao/request-basic-middleware/index'

interface UseRequest extends BasicRequest {
  <TData, TParams extends unknown[] = unknown[]>(
    fetcher: RequestFetcher<TData, TParams>,
    options?: RequestOptions<TData extends AxiosResponse<infer D> ? D : TData, TParams>,
  ): RequestResult<TData extends AxiosResponse<infer D> ? D : TData, TParams>
}

const useRequest = createRequest({
  manual: true,
  middleware: [RequestDebounce(), RequestThrottle(), RequestPolling({ errorRetryCount: 3 })],
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
  polling: {
    interval: 5000,
    whenHidden: false,
  },
  hooks: {
    before: () => {
      console.log('before', Date.now())
    },
    success: () => {
      console.log('success', Date.now())
    },
    error: () => {
      console.log('error')
    },
    after: () => {
      // console.log('after')
      console.log('after', Date.now())
    },
    cancel: () => {
      console.log('cancel', Date.now())
    },
  },
  debounce: {
    // wait: 1000,
  },
})

const loading = computed(() => getState().loading)
</script>

<template>
  <ElContainer style="height: 100vh; overflow: hidden">
    <ElMain>
      <ElCard>
        <div>
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
        </div>
        <p>
          {{ loading ? '加载中...' : '' }}
        </p>
        <p>state: {{ getState() }}</p>
      </ElCard>
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
