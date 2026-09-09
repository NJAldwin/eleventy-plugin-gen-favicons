const genIcons = require('./favicon-gen');
const genHtml = require('./html-gen');

// plugin options
// (manifestData & generateManifest can be overridden per shortcode)
const defaultOptions = {
  outputDir: './_site',
  urlPath: '/',
  manifestData: {},
  generateManifest: true,
  skipCache: false,
};

module.exports = (eleventyConfig, options) => {
  const {outputDir, urlPath, manifestData, generateManifest, skipCache} = Object.assign({}, defaultOptions, options);
  // favicons shortcode
  // examples:
  // {% favicons 'favicon.svg' %}
  // {% favicons 'favicon.svg', iconBgColor='black' %}
  // {% favicons 'favicon.svg', iconBgColor='black', manifestData={name:'My Website'} %}
  eleventyConfig.addAsyncShortcode('favicons', async (sourceFile, opts) => {
    const favOpts = Object.assign(
        {manifestData: manifestData, generateManifest: generateManifest, skipCache: skipCache},
        opts,
    );
    const generatedFiles = await genIcons(sourceFile, outputDir, urlPath, favOpts);
    return await genHtml(generatedFiles);
  });
};
