/**
 * Work around nuxt-safe-runtime-config@0.0.10 being published with
 * `catalog:` dependency specifiers by rewriting them to concrete versions.
 */

module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.name === 'nuxt-safe-runtime-config') {
        pkg.dependencies = pkg.dependencies || {}
        pkg.dependencies['@nuxt/kit'] = '^3.17.4'
        pkg.dependencies['@standard-schema/spec'] = '^1.0.0'
      }
      return pkg
    },
  },
}
