'use strict';

const webpack = require('webpack');

const defaultModule = {
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
};

module.exports = [
  {
    entry: { 'emarsys-m1': './src/magento1.js' },
    module: defaultModule
  },
  {
    entry: { 'emarsys-m2-after-233': './src/magento2.js' },
    plugins: [new webpack.DefinePlugin({ FORCE_CUSTOMER_RELOAD: JSON.stringify(true) })],
    module: defaultModule
  },
  {
    entry: { 'emarsys-m2': './src/magento2.js' },
    plugins: [new webpack.DefinePlugin({ FORCE_CUSTOMER_RELOAD: JSON.stringify(false) })],
    module: defaultModule
  }
];
