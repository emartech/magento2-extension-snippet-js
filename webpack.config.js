'use strict';

module.exports = {
  entry: {
    'emarsys-m1': './src/magento1.js',
    'emarsys-m2': './src/magento2.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  }
};
