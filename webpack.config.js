const path = require('path');
const HtmlWebpackPlugin = require("html-webpack-plugin");
const htmlWebpackPlugin = new HtmlWebpackPlugin({
  template: path.join(__dirname, "public/index.html"),
  filename: "./index.html"
});

module.exports = {
  entry: path.join(__dirname, "public/scripts/bundle.jsx"),
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'build'),
  },
  target: 'electron-renderer',
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        use: "babel-loader",
        exclude: /node_modules/
      },
      {
        test: /\.css$|.scss$/,
        use: ["style-loader", "css-loader", "sass-loader"]
      },
      {
        test: /\.node$/,
        loader: "node-loader"
      }
    ]
  },
  plugins: [htmlWebpackPlugin],
  resolve: {
    extensions: [".js", ".jsx"]
  },
};