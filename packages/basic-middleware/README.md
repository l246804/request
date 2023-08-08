# `@rhao/request-basic-middleware`

> `@rhao/request` 的基础中间件集合。

## 安装

```shell
pnpm i @rhao/request-basic-middleware
```

## 使用

### 全部安装

```ts
import { createRequest } from '@rhao/request'
import { createMiddleware } from '@rhao/request-basic-middleware'

export const useRequest = createRequest({
  middleware: createMiddleware({
    // 初始化配置项
  })
})
```

### 单个安装

```ts
import { createRequest } from '@rhao/request'
import { RequestDebounce } from '@rhao/request-basic-middleware/debounce'

export const useRequest = createRequest({
  middleware: [RequestDebounce()]
})
```
