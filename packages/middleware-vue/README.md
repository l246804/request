# @rhao/request-middleware-vue

Vue middleware of request.

## 安装

使用 `npm`
```shell
npm i vue @rhao/request @rhao/request-middleware-vue
```

使用 `yarn` or `pnpm`
```shell
pnpm add vue @rhao/request @rhao/request-middleware-vue
```

创建 `useRequest.ts`
```ts
// hooks/useRequest.ts
import { RequestVue } from '@rhao/request-middleware-vue'

export const useRequest = createRequest({ middleware: [RequestVue()] })
```

## 使用

```html
<script setup lang='ts'>
import { useRequest } from '@/hooks/useRequest'

// data: ref([])
// loading: ref(false)
// error: ref(undefined)
// params: ref([])
const { data, loading, error, params } = useRequest(() => Promise.resolve(1))
</script>

<template>
  <div>{{ data }}</div>
  <div v-if="loading">loading...</div>
</template>
```