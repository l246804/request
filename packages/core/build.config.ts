import { resolve } from 'node:path'
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['index'],
  declaration: true,
  clean: true,
  outDir: 'dist',
  rollup: {
    emitCJS: true,
    inlineDependencies: true,
    dts: {
      tsconfig: resolve(__dirname, '../../tsconfig.json'),
    },
  },
})
