# `@rhao/request-middleware-vue`

> 适配 `Vue` 的 `@rhao/request` 中间件。

## 安装

使用 `npm`
```shell
npm i vue @rhao/request @rhao/request-middleware-vue
```

使用 `yarn` or `pnpm`
```shell
pnpm add vue @rhao/request @rhao/request-middleware-vue
```

## 使用

创建 `useRequest.ts`。
```ts
// hooks/useRequest.ts
import { RequestVue } from '@rhao/request-middleware-vue'

export const useRequest = createRequestHook({ middleware: [RequestVue()] })
```

单文件组件中使用。
```html
<script setup lang='ts'>
import { useRequest } from 'hooks/useRequest'

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
