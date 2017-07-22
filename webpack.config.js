module.exports = {
  entry: './src/curses.js',
  output: {
    path: __dirname + '/dist',
    filename: 'curses.js',
    library: 'curses',
  },
  module: {
    loaders: [{
      test: /.js$/,
      loader: 'babel-loader',
    }, {
      test: /.js$/,
      loader: 'eslint-loader',
      options: {
        formatter: require('eslint/lib/formatters/unix'),
      },
    }],
  },
};
