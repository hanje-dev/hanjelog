const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const mode = process.env.NODE_ENV || 'development';
const isDev = mode === 'development';
const isProd = mode === 'production';

let appVersion = '';
let envAppVersion = '';
if (fs.existsSync(path.resolve(__dirname, 'package.json'))) {
  const pkgJson = fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8');
  appVersion = `${JSON.parse(pkgJson).version}`;
  envAppVersion = `"${JSON.parse(pkgJson).version}"`;
}

const DIST_PATH = path.resolve(__dirname, './dist');

module.exports = {
  entry: `./examples`,
  output: {
    path: DIST_PATH,
    filename: isProd ? `[name].${appVersion}.min.js` : '[name].js', // 入口js命名
    chunkFilename: isProd ? `[name].${appVersion}.min.js` : '[name].js'
  },
  resolve: {
    // require时省略的扩展名，如：require('module') 不需要module.js
    extensions: [
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.json'
    ],
    // 别名，可以直接使用别名来代表设定的路径以及其他
    alias: {
      '@': path.resolve('src')
    }
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /(node_modules|bower_components|test)/,
        include: path.resolve(__dirname, 'src'), // 精确指定要处理的目录
        use: 'babel-loader'
      },
      {
        test: /\.tsx?$/,
        exclude: /(node_modules|bower_components|test)/,
        use: 'babel-loader'
      }
    ]
  },
  plugins: [
    /**
     * 注入环境变量，可直接在js中使用
     * */
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: isProd ? '"production"' : '"development"',
        version: envAppVersion
      }
    }),
    new webpack.NamedChunksPlugin()
  ]
};
