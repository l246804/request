<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRequest } from './request'
import { http } from './http'

defineProps<{
  title: string
}>()

const state = ref(false)
function toggle() {
  state.value = !state.value
}

const ip = ref('')
const ready = ref(false)

const { data, loading } = useRequest(
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
    key: 'shared-key',
    ready: () => ready.value,
    swr: {
      staleTime: 5000,
    },
    hooks: {
      error: (e) => {
        ElMessage.error(e.message)
      },
    },
    refreshDeps: [state],
  },
)
</script>

<template>
  <ElCard :header="title">
    <ElButton @click="toggle">run</ElButton>
    <ElButton @click="ready = !ready">toggle</ElButton>
    {{ ready }}
    <ElInput v-model="ip" />
    <ElForm :inline="true">
      <ElFormItem label="loading">
        {{ loading }}
      </ElFormItem>
      <ElFormItem label="data">
        {{ data }}
      </ElFormItem>
    </ElForm>
  </ElCard>
</template>
