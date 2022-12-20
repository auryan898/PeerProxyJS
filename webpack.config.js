const path = require("path")

module.exports = {
  entry: path.resolve(__dirname, "src/peerproxy.js"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "main.js",
    library: "PeerProxyJS",
    libraryTarget: "umd",
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
  mode: "development",
  
}