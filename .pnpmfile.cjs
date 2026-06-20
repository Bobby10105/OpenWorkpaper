module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.dependencies && pkg.dependencies['postcss']) {
        pkg.dependencies['postcss'] = '8.5.15';
      }
      if (pkg.devDependencies && pkg.devDependencies['postcss']) {
        pkg.devDependencies['postcss'] = '8.5.15';
      }
      if (pkg.dependencies && pkg.dependencies['@hono/node-server']) {
        pkg.dependencies['@hono/node-server'] = '2.0.5';
      }
      if (pkg.devDependencies && pkg.devDependencies['@hono/node-server']) {
        pkg.devDependencies['@hono/node-server'] = '2.0.5';
      }
      return pkg;
    }
  }
}
