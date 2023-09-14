<script setup lang="ts">
import { ref } from 'vue'
import { useRequest } from './request'
import { http } from './http'

defineProps<{
  title: string
}>()

const ip = ref('')

function useIpRequest() {
  return useRequest(
    () =>
      http.get<{ start: string; end: string; addr: string[]; disp: string }>(
        'https://api.oioweb.cn/api/ip/ipaddress',
        {
          params: {
            ip: ip.value,
          },
        },
      ),
    {
      key: 'test-shared',
      swr: { staleTime: 10e3 },
      ignoreMiddleware: ['vue'],
    },
  )
}

const { data, loading, run, cancel, onSuccess } = useIpRequest()
const { data: data2, run: run2 } = useIpRequest()
onSuccess((data) => {
  console.log(data)
})

console.log(run, run2)
</script>

<template>
  <ElCard :header="title">
    <ElButton @click="run">
      run1
    </ElButton>
    <ElButton @click="run2">
      run2
    </ElButton>
    <ElButton @click="cancel">
      cancel
    </ElButton>
    <ElInput v-model="ip" />
    <ElForm :inline="true">
      <ElFormItem label="loading">
        {{ loading }}
      </ElFormItem>
      <ElFormItem label="data1">
        {{ data }}
      </ElFormItem>
      <ElFormItem label="data2">
        {{ data2 }}
      </ElFormItem>
    </ElForm>
  </ElCard>
</template>
