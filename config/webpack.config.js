const fs = require('fs')
const path = require('path')
const webpack = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')
const safePostCssParser = require('postcss-safe-parser')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const ModuleNotFoundPlugin = require('react-dev-utils/ModuleNotFoundPlugin')

const paths = require('./paths')
const getClientEnvironment = require('./env')

const appDirectory = fs.realpathSync(process.cwd())
const resolveApp = relativePath => path.resolve(appDirectory, relativePath)
const cssModuleRegex = /\.module\.css$/
const sassModuleRegex = /\.module\.(scss|sass)$/
const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP !== 'false'

module.exports = function(webpackEnv) {
  const isEnvDevelopment = webpackEnv === 'development'
  const isEnvProduction = webpackEnv === 'production'

  const publicPath = isEnvProduction ? paths.servedPath : isEnvDevelopment && '/'
  const shouldUseRelativeAssetPaths = publicPath === './'
  const shouldInlineRuntimeChunk = process.env.INLINE_RUNTIME_CHUNK !== 'false'

  const publicUrl = isEnvProduction ? publicPath.slice(0, -1) : isEnvDevelopment && ''

  const env = getClientEnvironment(publicUrl)

  const getStyleLoaders = (cssOptions, preProcessor) => {
    const loaders = [
      isEnvDevelopment && require.resolve('style-loader'),
      isEnvProduction && {
        loader: MiniCssExtractPlugin.loader,
        options: Object.assign(
          {},
          shouldUseRelativeAssetPaths ? { publicPath: '../../' } : undefined
        )
      },
      {
        loader: require.resolve('css-loader'),
        options: cssOptions
      },
      {
        // Options for PostCSS as we reference these options twice
        // Adds vendor prefixing based on your specified browser support in
        // package.json
        loader: require.resolve('postcss-loader'),
        options: {
          // Necessary for external CSS imports to work
          // https://github.com/facebook/create-react-app/issues/2677
          ident: 'postcss',
          plugins: () => [
            require('postcss-flexbugs-fixes'),
            require('postcss-preset-env')({
              autoprefixer: {
                flexbox: 'no-2009'
              },
              stage: 3
            })
          ],
          sourceMap: isEnvProduction && shouldUseSourceMap
        }
      }
    ].filter(Boolean)
    if (preProcessor) {
      loaders.push({
        loader: require.resolve(preProcessor),
        options: {
          sourceMap: isEnvProduction && shouldUseSourceMap
        }
      })
    }
    return loaders
  }

  const pages = [
    {
      name: 'index',
      chunks: ['index', 'runtime~index', 'vendor-lodash'],
      entry: resolveApp('./src/pages/index/index.js'),
      template: resolveApp('./src/pages/index/index.html')
    },
    {
      name: 'about',
      chunks: ['about', 'runtime~about', 'vendor-jquery', 'vendor-lodash'],
      entry: resolveApp('./src/pages/about/index.js'),
      template: resolveApp('./src/pages/about/about.html')
    }
  ]

  const getEntries = () => {
    let res = {}
    pages.forEach(page => {
      res[page.name] = page.entry
    })
    return res
  }

  const getHtmlWebpackPlugin = htmlOptions => {
    return new HtmlWebpackPlugin(
      Object.assign(
        {},
        htmlOptions,
        isEnvProduction
          ? {
              minify: {
                removeComments: true,
                collapseWhitespace: true,
                removeRedundantAttributes: true,
                useShortDoctype: true,
                removeEmptyAttributes: true,
                removeStyleLinkTypeAttributes: true,
                keepClosingSlash: true,
                minifyJS: true,
                minifyCSS: true,
                minifyURLs: true
              }
            }
          : undefined
      )
    )
  }

  const getHtmls = () => {
    let res = []
    pages.forEach(page => {
      res.push(
        getHtmlWebpackPlugin({
          inject: true,
          chunks: page.chunks,
          template: page.template,
          filename: `${page.name}.html`
        })
      )
    })
    return res
  }

  return {
    mode: isEnvProduction ? 'production' : isEnvDevelopment && 'development',
    bail: isEnvProduction,
    devtool: isEnvProduction
      ? shouldUseSourceMap
        ? 'source-map'
        : false
      : isEnvDevelopment && 'cheap-module-source-map',
    entry: getEntries(),
    output: {
      path: isEnvProduction ? paths.appBuild : undefined,
      filename: isEnvProduction
        ? 'static/js/[name].[contenthash:8].js'
        : isEnvDevelopment && 'static/js/bundle.js',
      chunkFilename: isEnvProduction
        ? 'static/js/[name].[contenthash:8].chunk.js'
        : isEnvDevelopment && 'static/js/[name].chunk.js',
      publicPath: publicPath,
      devtoolModuleFilenameTemplate: isEnvProduction
        ? info => path.relative(paths.appSrc, info.absoluteResourcePath).replace(/\\/g, '/')
        : isEnvDevelopment && (info => path.resolve(info.absoluteResourcePath).replace(/\\/g, '/'))
    },
    optimization: {
      minimize: isEnvProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            parse: {
              // we want terser to parse ecma 8 code. However, we don't want it
              // to apply any minfication steps that turns valid ecma 5 code
              // into invalid ecma 5 code. This is why the 'compress' and 'output'
              // sections only apply transformations that are ecma 5 safe
              // https://github.com/facebook/create-react-app/pull/4234
              ecma: 8
            },
            compress: {
              ecma: 5,
              warnings: false,
              // Disabled because of an issue with Uglify breaking seemingly valid code:
              // https://github.com/facebook/create-react-app/issues/2376
              // Pending further investigation:
              // https://github.com/mishoo/UglifyJS2/issues/2011
              comparisons: false,
              // Disabled because of an issue with Terser breaking valid code:
              // https://github.com/facebook/create-react-app/issues/5250
              // Pending futher investigation:
              // https://github.com/terser-js/terser/issues/120
              inline: 2
            },
            mangle: {
              safari10: true
            },
            output: {
              ecma: 5,
              comments: false,
              // Turned on because emoji and regex is not minified properly using default
              // https://github.com/facebook/create-react-app/issues/2488
              ascii_only: true
            }
          },
          // Use multi-process parallel running to improve the build speed
          // Default number of concurrent runs: os.cpus().length - 1
          parallel: true,
          // Enable file caching
          cache: true,
          sourceMap: shouldUseSourceMap
        }),
        new OptimizeCSSAssetsPlugin({
          cssProcessorOptions: {
            parser: safePostCssParser,
            map: shouldUseSourceMap
              ? {
                  // `inline: false` forces the sourcemap to be output into a
                  // separate file
                  inline: false,
                  // `annotation: true` appends the sourceMappingURL to the end of
                  // the css file, helping the browser find the sourcemap
                  annotation: true
                }
              : false
          }
        })
      ],
      // Automatically split vendor and commons
      // https://twitter.com/wSokra/status/969633336732905474
      // https://medium.com/webpack/webpack-4-code-splitting-chunk-graph-and-the-splitchunks-optimization-be739a861366
      splitChunks: {
        chunks: 'all',
        name: true,
        cacheGroups: {
          'vendor-jquery': {
            name: 'vendor-jquery',
            test: /[\\/]node_modules[\\/](jquery)[\\/]/,
            chunks: 'initial',
            priority: 2
          },
          'vendor-lodash': {
            name: 'vendor-lodash',
            test: /[\\/]node_modules[\\/](lodash)[\\/]/,
            chunks: 'initial',
            priority: 2
          },
          // 'vendor-all': {
          //   name: 'vendor-all',
          //   test: /[\\/]node_modules[\\/]/,
          //   chunks: 'initial',
          //   priority: 1
          // }
        }
      },
      // Keep the runtime chunk separated to enable long term caching
      // https://twitter.com/wSokra/status/969679223278505985
      runtimeChunk: true
    },
    resolve: {
      alias: {
        '@': resolveApp('./src')
      }
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: require.resolve('babel-loader')
        },
        {
          oneOf: [
            {
              test: /\.(jpe?g|png|gif)$/,
              use: {
                loader: require.resolve('url-loader'),
                options: {
                  name: 'static/img/[name]_[hash:4].[ext]',
                  limit: 10
                }
              }
            },
            {
              test: /\.(eot|ttf|svg)$/,
              use: {
                loader: require.resolve('url-loader')
              }
            },
            {
              test: /\.(scss|sass)$/,
              exclude: sassModuleRegex,
              use: getStyleLoaders(
                {
                  importLoaders: 2,
                  sourceMap: false
                },
                'sass-loader'
              )
            },
            {
              test: /\.css$/,
              exclude: cssModuleRegex,
              use: getStyleLoaders({
                importLoaders: 1,
                sourceMap: false
              })
            }
          ]
        }
      ]
    },
    plugins: [
      ...getHtmls(),
      new webpack.DefinePlugin(env.stringified),
      isEnvProduction &&
        new MiniCssExtractPlugin({
          // Options similar to the same options in webpackOptions.output
          // both options are optional
          filename: 'static/css/[name].[contenthash:4].css',
          chunkFilename: 'static/css/[name].[contenthash:4].chunk.css'
        }),
      new ModuleNotFoundPlugin(paths.appPath),
      isEnvDevelopment && new webpack.HotModuleReplacementPlugin()
      //查看包构成大小
      // new BundleAnalyzerPlugin()
    ].filter(Boolean)
  }
}
