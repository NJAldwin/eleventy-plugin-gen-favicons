const genIcons = require('./favicon-gen');
const genHtml = require('./html-gen');

// plugin options
// (manifestData & generateManifest can be overridden per shortcode)
const defaultOptions = {
  outputDir: './_site',
  manifestData: {},
  generateManifest: true,
  skipCache: false,
};

module.exports = (eleventyConfig, options) => {
  const {outputDir, manifestData, generateManifest, skipCache} = Object.assign({}, defaultOptions, options);
  // favicons shortcode
  // examples:
  // {% favicons 'favicon.svg' %}
  // {% favicons 'favicon.svg', appleIconBgColor='black' %}
  // {% favicons 'favicon.svg', appleIconBgColor='black', manifestData={name:'My Website'} %}
  eleventyConfig.addAsyncShortcode('favicons', async (sourceFile, opts) => {
    const favOpts = Object.assign(
        {manifestData: manifestData, generateManifest: generateManifest, skipCache: skipCache},
        opts,
    );
    const generatedFiles = await genIcons(sourceFile, outputDir, favOpts);
    return await genHtml(generatedFiles);
  });
};
