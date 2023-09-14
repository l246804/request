# `@rhao/request-basic-middleware`

> `@rhao/request` 的基础中间件集合。

## 安装

```shell
pnpm add @rhao/request-basic-middleware
```

## 使用

### 安装

```ts
import { createRequestHook } from '@rhao/request'

// 不推荐：将扩展所有中间件自定义配置项
import { RequestDebounce } from '@rhao/request-basic-middleware'

// 推荐：仅扩展相关中间件自定义配置项
import { RequestDebounce } from '@rhao/request-basic-middleware/middleware/debounce'

export const useRequest = createRequestHook({
  middleware: [RequestDebounce()]
})
```
