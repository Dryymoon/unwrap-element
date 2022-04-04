const { merge } = require('webpack-merge');
const path = require("path");
const pkj = require('./package.json');

console.log(path.resolve(__dirname, pkj.entry));

const commonConfig = {
  entry: path.resolve(__dirname, pkj.entry),
  module: {
    rules: [
      {
        test: /\.m?(js)$/,
        exclude: /node_modules/,
        use: "babel-loader",
      },
    ],
  },
  mode: "development",
  devtool: 'source-map',
}

module.exports = [

  // common legacy build
  merge(commonConfig, {
    output: {
      path: path.resolve(__dirname, path.dirname(pkj.main)),
      filename: path.basename(pkj.main),
      library: { name: pkj.name, type: "umd" },
      globalObject: 'this',
    }
  }),

  // common legacy minified build
  pkj.browser && merge(commonConfig, {
    output: {
      path: path.resolve(__dirname, path.dirname(pkj.browser)),
      filename: path.basename(pkj.browser),
      library: { name: pkj.name, type: "umd" },
      globalObject: 'this',
    },
    mode: "production",
  }),

  // module build
  pkj.module && merge(commonConfig, {
    output: {
      path: path.resolve(__dirname, path.dirname(pkj.module)),
      filename: path.basename(pkj.module),
      library: { type: "module" },
    },
    experiments: { outputModule: true }
  }),
].filter(it => it);