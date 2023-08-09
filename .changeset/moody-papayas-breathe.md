---
'@rhao/request-basic-middleware': minor
---

feat: 新增 `refresh-token` 中间件

- 新增 `refresh-token` 中间件，用于无感刷新 `token`
- 修复 `retry` 中间件在未设置 `count` 时未调用 `next`
- 修复 `retry` 中间件默认的 `interval` 指数计算错误
- 完善 `swr` 中间件流程
- 删除带有副作用的初始化配置项
- 更新 `index.ts` 只用于集体导出