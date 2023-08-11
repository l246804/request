require('@esbuild-kit/cjs-loader')

const { setupGenerators } = require('@rhao/plop-generators')

module.exports = function (plop) {
  setupGenerators(plop, {
    /** @type {import('@rhao/plop-generators').ConfigGeneratorOptions} */
    configGenerator: {
      additionalArgs: ['-w'],
    },
  })
}
