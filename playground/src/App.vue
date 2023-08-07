<script setup lang="ts">
import type { AxiosResponse } from 'axios'
import type {
  BasicRequest,
  RequestFetcher,
  RequestOptions,
  RequestResult,
} from '@rhao/request/index'
import { createRequest } from '@rhao/request/index'
import {
  RequestDebounce,
  RequestRefresh,
  RequestRetry,
  RequestThrottle,
} from '@rhao/request-basic-middleware/index'
import { RequestVue } from '@rhao/request-middleware-vue/index'
import { ref } from 'vue'

interface UseRequest extends BasicRequest {
  <TData, TParams extends unknown[] = unknown[]>(
    fetcher: RequestFetcher<TData, TParams>,
    options?: RequestOptions<TData extends AxiosResponse<infer D> ? D : TData, TParams>,
  ): RequestResult<TData extends AxiosResponse<infer D> ? D : TData, TParams>
}

const useRequest = createRequest({
  manual: true,
  middleware: [
    RequestDebounce(),
    RequestThrottle(),
    RequestRetry(),
    RequestRefresh({ errorRetryCount: 3 }),
    RequestVue(),
  ],
}) as UseRequest

function getUsername(): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`${Date.now()}`)
    }, 100)
  })
}

const text = ref('')
const { data, loading } = useRequest(getUsername, {
  throttle: {
    wait: 500,
  },
  refreshDeps: text,
})
</script>

<template>
  <ElContainer style="height: 100vh; overflow: hidden">
    <ElMain>
      <ElCard>
        <ElForm :inline="true">
          <ElFormItem>
            <ElInput v-model="text" />
          </ElFormItem>
        </ElForm>

        <p>{{ loading ? '加载中...' : '' }}</p>
        <p>读取值：{{ data }}</p>
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
