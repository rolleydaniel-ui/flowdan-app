import type { Configuration } from 'webpack';

export const mainConfig: Configuration = {
  entry: './src/main/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: { transpileOnly: true },
        },
      },
      {
        test: /\.node$/,
        use: 'node-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.ts', '.json'],
  },
  externals: {
    'sql.js': 'commonjs sql.js',
    'uiohook-napi': 'commonjs uiohook-napi',
  },
};

export default mainConfig;
