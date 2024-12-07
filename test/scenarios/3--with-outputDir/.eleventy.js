const eleventyPluginGenFavicon = require('../../../index');

module.exports = function(eleventyConfig) {
    eleventyConfig.addPlugin(eleventyPluginGenFavicon, {outputDir: "overriden-outDir"});
}
