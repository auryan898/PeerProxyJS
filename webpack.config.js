const path = require("path")

module.exports = {
  entry: path.resolve(__dirname, "src/peerproxy.js"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "peerproxy.js",
    library: "PeerProxyJS",
    libraryTarget: "umd",
  },
  module: {
    rules: [
      {
        test: /\.(js)$/,
        exclude: /node_modules/,
        enforce: 'pre',
        use: ["babel-loader", "source-map-loader"],
        
      },
    ],
  },
  mode: "production",
  
}