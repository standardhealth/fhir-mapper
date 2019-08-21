const path = require('path');

const nodeConfig = {
  entry: './src/index.js',
  output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'app.node.bundle.js',
      library: 'Mapper',
      libraryTarget: 'umd'
  },
  target: 'node',
  module: {
      rules: [
        {
          test: /\.m?js$/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        }
      ]
    },
  stats: {
      colors: true
  },
  devtool: 'source-map'
};

const webConfig = {
  entry: [
    '@babel/polyfill',
    './src/index.js'],
  output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'app.bundle.js',
      library: 'Mapper',
      libraryTarget: 'umd'
  },
  node: {
    fs: "empty"
 },
  module: {
      rules: [
        {
          test: /\.m?js$/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        }
      ]
    },
  stats: {
      colors: true
  },
  devtool: 'source-map'
};


module.exports = [webConfig, nodeConfig]