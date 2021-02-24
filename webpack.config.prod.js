const config = require('./webpack.config.base');
const plugins = [];

config.entry = {
  'yata-inline': './src/yata',
  'yata-timing': './src/timing',
};
config.output.chunkFilename = 'app.[chunkHash:10].min.js';
config.output.publicPath = '/'; // 资源路径
config.output.crossOriginLoading = 'anonymous';

config.plugins = (config.plugins || []).concat(plugins);

module.exports = config;
