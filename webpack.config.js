const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = (base, options) => {
  const plugins = [
    ...base.plugins,
    new CleanWebpackPlugin('doitintl-bigquery-datasource/', { allowExternal: true }),
    new CleanWebpackPlugin('doitintl-bigquery-datasource-*.zip', { allowExternal: true }),
    new CopyWebpackPlugin([{ from: 'partials/*', to: '.' }]),
    // TODO
    // new CopyWebpackPlugin([{ from: '../dist/', to: '../doitintl-bigquery-datasource/' }]),
  ];

  return {
    ...base,
    plugins,
  };
};
