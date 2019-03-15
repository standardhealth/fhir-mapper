const path = require('path');
module.exports = {
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'app.bundle.js',
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
