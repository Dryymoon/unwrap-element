const path = require("path")

module.exports = {
  entry: "./unwrap-element.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "unwrap-element.js",
    library: "unwrapElement",
    libraryTarget: 'umd',
    globalObject: 'this',
  },
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