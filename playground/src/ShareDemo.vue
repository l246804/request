<script setup lang="ts">
import { ref } from 'vue'
import { useRequest } from './request'

defineProps<{
  title: string
}>()

function getUsername(): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`${Date.now()}`)
    }, 2000)
  })
}

const state = ref(false)
function toggle() {
  state.value = !state.value
}

const { data, loading } = useRequest(getUsername, {
  key: 'shared-key',
  hooks: {
    success: (data) => {
      console.log(data)
    },
  },
  refreshDeps: [state],
})
</script>

<template>
  <ElCard :header="title">
    <ElButton @click="toggle">重新发起请求</ElButton>
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
