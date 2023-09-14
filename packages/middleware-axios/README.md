# `@rhao/request-middleware-axios`

> 搭建 `Axios` 与 `@rhao/request` 桥梁的中间件。

## 安装

使用 `npm`

```shell
npm i vue @rhao/request @rhao/request-middleware-axios
```

使用 `yarn` or `pnpm`

```shell
pnpm add vue @rhao/request @rhao/request-middleware-axios
```

## 使用

创建 `axios.ts`

```ts
// utils/axios.ts
import Axios from 'axios'

export const axios = Axios.create({
  // ...
})
```

创建 `useRequest.ts`

```ts
// hooks/useRequest.ts
import type {
  BasicRequestHook,
  RequestFetcher,
  RequestOptions,
  RequestResult,
} from '@rhao/request'
import { RequestAxios } from '@rhao/request-middleware-vue'
import { AxiosResponse } from 'axios'

type FlattenAxiosResponse<T> = T extends AxiosResponse<infer D> ? D : T

// 自定义调用类型
interface UseRequest extends BasicRequestHook {
  <TData, TParams extends unknown[] = unknown[]>(
    fetcher: RequestFetcher<TData, TParams>,
    options?: RequestOptions<FlattenAxiosResponse<TData>, TParams>,
  ): RequestResult<FlattenAxiosResponse<TData>, TParams>
}

// 后端数据格式
interface DataFormat {
  success: boolean
  data: any
  message?: string
}

export const useRequest = createRequestHook({
  // 此处解析数据格式，仅返回响应的后端数据
  dataParser: (data: AxiosResponse) => {
    // 响应状态码错误
    if (data.status !== 200) throw new Error(data.statusText)

    // 解析后端格式
    const realData: DataFormat = data.data

    // 后端数据错误
    if (!realData.success) throw new Error(realData.message)

    // 返回解析后的数据
    return realData.data
  },
  middleware: [RequestAxios({ associativeCancel: true })]
}) as UseRequest
```

创建 `api.ts`

```ts
// apis/example.ts
import { axios } from 'utils/axios'

export interface Params {
  a: number
  b: string
}

export interface DataItem {
  a: number
  b: string
}

export const queryList = (params: Params) => axios.get<DataItem[]>('/api/example/list', { params })
```

使用 `useRequest`
```ts
import { useRequest } from 'hooks/useRequest'
import { queryList } from 'apis/example'

// data => Ref<DataItem[] | null> // 这里会自动对 AxiosResponse 进行拆包
// params => Ref<[Params]> // 会自动推导出 queryList 的入参
const { data, loading, error, params } = useRequest(queryList, {
  manual: false,

  // 初次自动调用时的参数，设置 `manual` 为 `false` 时有效
  // 类型会自动推导出 Params
  defaultParams: [{ a: 1, b: '123' }],

  // 这里可以传入 axios 的配置项，支持函数格式
  axiosConfig: {
    timeout: 10e3
  }
})
```
