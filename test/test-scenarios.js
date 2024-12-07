const test = require('ava');
const {cwd} = require('process');
const {readdirSync} = require('fs');
const {buildScenarios} = require('eleventy-test');

test('outputDir overrides eleventy output dir', async (t) => {
  const results = await buildScenarios({
    projectRoot: cwd(),
    returnArray: false,
    scenariosDir: 'test/scenarios/',
    globalInputDir: 'test/scenario-input/',
  });


  // Has no outputDir defined, defaults to eleventyConfig directory
  t.is(Object.keys(results['3--without-outputDir'].files).length, 7);
  // Has an outputDir defined, overrides eleventyConfig directory
  t.is(Object.keys(results['3--with-outputDir'].files).length, 1);
  t.is(readdirSync('test/scenarios/3--with-outputDir/overriden-outDir/').length, 6);
});
