# @rhao/request-basic-middleware

## 3.0.0

### Minor Changes

- a08e72d: refactor: 重构数据中心，使用 context 提供的方式

### Patch Changes

- Updated dependencies [c5a18da]
- Updated dependencies [a1e9f2e]
  - @rhao/request@2.1.0

## 2.0.0

### Major Changes

- 85be1ab: chore: 🤖 添加许可证文件

### Patch Changes

- Updated dependencies [85be1ab]
  - @rhao/request@2.0.0
  - @rhao/request-utils@2.0.0

## 1.0.2

### Patch Changes

- chore: 完善 refresh-token 中间件

## 1.0.1

### Patch Changes

- aa84584: chore: 更新依赖包
- Updated dependencies [aa84584]
- Updated dependencies [aa84584]
  - @rhao/request@1.0.1
  - @rhao/request-utils@1.0.1

## 1.0.0

### Major Changes

- 3f4fdb3: feat: 开发 `request` 核心及其中间件

### Minor Changes

- e3849ec: feat: 新增 `refresh-token` 中间件

  - 新增 `refresh-token` 中间件，用于无感刷新 `token`
  - 修复 `retry` 中间件在未设置 `count` 时未调用 `next`
  - 修复 `retry` 中间件默认的 `interval` 指数计算错误
  - 完善 `swr` 中间件流程
  - 删除带有副作用的初始化配置项
  - 更新 `index.ts` 只用于集体导出

### Patch Changes

- Updated dependencies [3f4fdb3]
- Updated dependencies [41ac650]
  - @rhao/request@1.0.0
  - @rhao/request-utils@1.0.0
