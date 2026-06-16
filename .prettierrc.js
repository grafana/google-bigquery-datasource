module.exports = {
  // Prettier configuration provided by Grafana scaffolding
  ...require('./.config/.prettierrc.js'),
  plugins: ['@trivago/prettier-plugin-sort-imports'],
  // Groups: builtin (node), external, internal (aliases), parent, sibling, index
  importOrder: [
    '^\\u0000',
    // place lodash near the top of imports
    '^lodash(.*)$',
    '^react(.*)$',
    '^@?\\w',
    '^@/',
    '^\\.\\./',
    '^\\./',
    '^.+\\.css$',
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
};
