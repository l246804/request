import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['index'],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
    dts: {
      compilerOptions: {
        noEmitOnError: false,
      },
    },
  },
  failOnWarn: false,
})
