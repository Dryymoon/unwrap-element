const path = require("path")

module.exports = {
  entry: "./unwrap-element.mjs",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "unwrap-element.min.js",
    library: {
      name: "unwrapElement",
      type: "umd"
    },
  },
  module: {
    rules: [
      {
        test: /\.(js)$/,
        exclude: /node_modules/,
        use: "babel-loader",
      },
    ],
  },
  mode: "production",
  devtool: 'source-map',
}