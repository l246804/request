import type { BuildEntry } from 'unbuild'
import { defineBuildConfig } from 'unbuild'

function createEntry(format: 'esm' | 'cjs') {
  return {
    input: 'src',
    outDir: 'dist',
    builder: 'mkdist',
    format,
    ext: format === 'esm' ? 'mjs' : 'cjs',
  } as BuildEntry
}

export default defineBuildConfig({
  entries: [createEntry('cjs'), createEntry('esm')],
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
