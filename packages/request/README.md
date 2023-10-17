# `@rhao/request`

> 一个基于中间件模式的高扩展数据请求状态管理库。

## 安装

使用 `npm`

```shell
npm i @rhao/request
```

使用 `pnpm` 或者 `yarn`

```shell
pnpm add @rhao/request
```

## 使用

### 创建 `useRequest`

```ts
// src/hooks/useRequest.ts
import { createRequestHook } from '@rhao/request'

export const useRequest = createRequestHook()
```

### 基础示例

```ts
const { getState, run, refresh, cancel } = useRequest((num: number) => Promise.resolve(num), {
  immediate: false
})

await run(1)
getState().data // => 1

await run(2)
getState().data // => 2

await refresh()
getState().data // => 2
```

### 使用中间件

#### 安装中间件

```shell
pnpm add @rhao/request-basic-middleware
```

#### 全局使用

```ts
import { createRequestHook } from '@rhao/request'
import { RequestDebounce, RequestThrottle } from '@rhao/request-basic-middleware'

export const useRequest = createRequestHook({
  middleware: [RequestDebounce(), RequestThrottle()]
})
```

#### 局部使用

```ts
import { RequestDebounce } from '@rhao/request-basic-middleware'

const { getState, run } = useRequest(() => Promise.resolve(Date.now()), {
  immediate: false,
  debounce: {
    wait: 3000
  },
  middleware: [RequestDebounce()]
})

// 3s 内仅触发一次
run()
run()
run()
```

### 适配 `Vue`

基于 `vue-demi` 适配 `vue2` 和 `vue3`。

#### 安装依赖

```shell
pnpm add vue @rhao/request-middleware-vue
```

#### 注册中间件

***注意：推荐全局注册。***

```ts
import { RequestVue } from '@rhao/request-middleware-vue'

export const useRequest = createRequestHook({
  middleware: [RequestVue()]
})
```

#### 使用

```ts
const {
  data,
  loading,
  error,
  params,
  run
} = useRequest(() => Promise.resolve(Date.now()), {
  immediate: false
})

await run()
data.value // => Date.now()
```

## 开发中间件

`createRequestHook` 负责创建用于管理整个请求流程的 `hook` 函数，通过注册不同中间件来满足各种场景下的使用，支持函数和对象两种形式。

> 通过 `hooks` 事件开发和 `middleware` 开发的区别：
>  - hook：before、after 回调顺序执行（先注册先执行），不符合整个请求流，且不支持中断后续回调
>  - middleware：before、after 成对顺序执行（参考洋葱圈模型），符合整个请求流，支持中间件自主中断后续执行


### 函数示例

```ts
import type { RequestMiddleware } from '@rhao/request'

export function RequestLogger() {
  // 必须调用 next 执行下一个中间件函数
  const middleware: RequestMiddleware = async (ctx, next) => {
    console.log('[RequestLogger] - start:', Date.now())
    await next()
    console.log('[RequestLogger] - end:', Date.now())
  }

  middleware.priority = -1

  // 每调用一次 `useRequest` 就会执行 `setup` 进行安装中间件
  // 可通过传入的 `context` 对 `options`、`result` 进行改造
  middleware.setup = (ctx) => {
    console.log('[RequestLogger] - 开始安装')

    console.log('[RequestLogger] - 当前配置项：', ctx.getOptions())

    ctx.hooks.hook('before', (params) => {
      console.log('[RequestLogger] - 调用参数：', params)
    })

    ctx.hooks.hook('success', () => {
      console.log('[RequestLogger] - 调用成功')
    })

    ctx.hooks.hook('after', () => {
      console.log('[RequestLogger] - 调用失败')
    })

    ctx.hooks.hook('cancel', () => {
      console.log('[RequestLogger] - 调用取消')
    })
  }

  return middleware
}
```

### 对象示例

```ts
import type { RequestMiddleware } from '@rhao/request'

export function RequestLogger() {
  // 支持函数和对象两种形式

  const middleware: RequestMiddleware = {
    // 优先级，数值越高越先执行
    priority: -1,

    // 每调用一次 `useRequest` 就会执行 `setup` 进行安装中间件
    // 可通过传入的 `context` 对 `options`、`result` 进行改造
    setup: (ctx) => {
      console.log('[RequestLogger] - 开始安装')

      console.log('[RequestLogger] - 当前配置项：', ctx.getOptions())

      ctx.hooks.hook('before', (params) => {
        console.log('[RequestLogger] - 调用参数：', params)
      })

      ctx.hooks.hook('success', () => {
        console.log('[RequestLogger] - 调用成功')
      })

      ctx.hooks.hook('after', () => {
        console.log('[RequestLogger] - 调用失败')
      })

      ctx.hooks.hook('cancel', () => {
        console.log('[RequestLogger] - 调用取消')
      })
    },

    // 实际参与到执行中的处理函数，可不设置
    handler: (ctx, next) => {
      console.log('[RequestLogger] - start:', Date.now())
      await next()
      console.log('[RequestLogger] - end:', Date.now())
    }
  }

  return middleware
}
```

## 类型扩展

在 `tsconfig.json` 所包含的文件目录中创建任意 `.ts` 或 `.d.ts` 文件添加如下代码。

```ts
// src/types/request.d.ts
declare module '@rhao/request' {
  interface RequestBasicOptions<TData, TParams extends unknown[] = unknown[]> {
    // 扩展基础配置项
  }

  interface RequestOptions<TData, TParams extends unknown[] = unknown[]> {
    // 扩展配置项
  }

  interface RequestResult<TData, TParams extends unknown[] = unknown[]> {
    // 扩展结果
  }

  interface RequestConfigHooks<TData, TParams extends unknown[] = unknown[]> {
    // 扩展 hooks
  }

  interface RequestBasicContext<TData, TParams extends unknown[] = unknown[]> {
    // 扩展基础上下文
  }

  interface RequestContext<TData, TParams extends unknown[] = unknown[]> {
    // 扩展执行上下文
  }
}
```

## 迁移至 v3.x

> - `createRequest` -> `createRequestHook`
> - `useRequest().counter` -> `useRequest().keyManager`
> - `options`
>   + `dataCompare` -> `dataComparer`
>   + `manual` -> `immediate`
> - `types`
>   + `BasicRequest` -> `BasicRequestHook`
>   + `RequestHooks` -> `RequestConfigHooks`
>   + ~~`RequestCustomXxx`~~
