const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const config = require('./webpack.config.base');
const plugins = [
  new HtmlWebpackPlugin({
    template: path.resolve(__dirname, './examples/index.html'),
    filename: './index.html'
  }),
  new webpack.HotModuleReplacementPlugin()
];


config.devtool = 'source-map';      // source-map
config.output.publicPath = '/';     // 资源路径
config.plugins = (config.plugins || []).concat(plugins);

config.devServer = {
  contentBase: path.join(__dirname, './src'),
  port: 7012,
  compress: true,
  host: '0.0.0.0',
  disableHostCheck: true,
  clientLogLevel: 'info',
  hot: true,
  // hotOnly: false,
  // inline: false,
  lazy: false,
  watchContentBase: false,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
  },
  /*proxy: {
    '/log/': {
      target: 'http://10.199.155.55:10000/',
      changeOrigin: true
    }
  }*/
};

module.exports = config;
