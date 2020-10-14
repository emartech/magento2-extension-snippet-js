'use strict';

const webpack = require('webpack');

const buildsForMagento2 = {
  // legacy builds
  'emarsys-m2': { contactIdentifier: 'email', forceCustomerReload: false },
  'emarsys-m2-after-233': { contactIdentifier: 'email', forceCustomerReload: true },

  'emarsys-m2-email-before-233': { contactIdentifier: 'email', forceCustomerReload: false },
  'emarsys-m2-email-after-233': { contactIdentifier: 'email', forceCustomerReload: true },
  'emarsys-m2-id-before-233': { contactIdentifier: 'id', forceCustomerReload: false },
  'emarsys-m2-id-after-233': { contactIdentifier: 'id', forceCustomerReload: true }
};

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

  ...Object.keys(buildsForMagento2).map((key) => {
    return {
      entry: { [key]: './src/magento2.js' },
      plugins: [
        new webpack.DefinePlugin({
          FORCE_CUSTOMER_RELOAD: JSON.stringify(buildsForMagento2[key].forceCustomerReload),
          CONTACT_IDENTIFIER: JSON.stringify(buildsForMagento2[key].contactIdentifier)
        })
      ],
      module: defaultModule
    };
  })
];
