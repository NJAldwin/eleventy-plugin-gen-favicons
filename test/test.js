const test = require('ava');
const genFavicon = require('../favicon-gen');
const genHtml = require('../html-gen');
const fs = require('fs');
const path = require('path');
const ico = require('icojs');
const sharp = require('sharp');

const testSvg = 'test/img/nick.svg';
const genDir = 'test/gen/';

const expectedFiles = {
  'svg': '/favicon.svg',
  'ico': '/favicon.ico',
  'apple': '/apple-touch-icon.png',
  'googleHome': '/icon-192.png',
  'googleLoading': '/icon-512.png',
  'manifest': '/manifest.webmanifest',
};

const expectedSizes = {
  'ico': [64, 32, 16],
  'apple': 180,
  'googleHome': 192,
  'googleLoading': 512,
};

test('errors on file not found', async (t) => {
  await t.throwsAsync(genFavicon('not a real file', genDir));
});

test('errors on not square img', async (t) => {
  await t.throwsAsync(genFavicon('test/img/notsquare.png', genDir));
});

test('errors on too large apple padding', async (t) => {
  await t.throwsAsync(genFavicon('test/img/testing.png', genDir, {appleIconPadding: 180}));
});

const assertCorrectIcons = async (t, output, outDir, opts) => {
  const {expectSvg, expectManifest, extraManifest} =
    Object.assign({expectSvg: true, expectManifest: true, extraManifest: {}}, opts);

  const expectedOutput = Object.assign({}, expectedFiles);
  if (! expectSvg) {
    delete expectedOutput.svg;
  }
  if (! expectManifest) {
    delete expectedOutput.manifest;
  }
  t.deepEqual(expectedOutput, output);

  t.is(expectSvg, fs.existsSync(path.join(outDir, expectedFiles['svg'])));
  t.assert(fs.existsSync(path.join(outDir, expectedFiles['ico'])));
  t.assert(fs.existsSync(path.join(outDir, expectedFiles['apple'])));
  t.assert(fs.existsSync(path.join(outDir, expectedFiles['googleHome'])));
  t.assert(fs.existsSync(path.join(outDir, expectedFiles['googleLoading'])));
  t.is(expectManifest, fs.existsSync(path.join(outDir, expectedFiles['manifest'])));

  const icoDims = (await ico.parse(fs.readFileSync(path.join(outDir, expectedFiles['ico']))))
      .map((i) => [i.width, i.height]);
  t.deepEqual(expectedSizes['ico'].map((d) => [d, d]).sort(), icoDims.sort());

  for (const file of ['apple', 'googleHome', 'googleLoading']) {
    const meta = await sharp(path.join(outDir, expectedFiles[file])).metadata();
    t.deepEqual([expectedSizes[file], expectedSizes[file]], [meta.width, meta.height]);
  }

  if (expectManifest) {
    const manifest = JSON.parse(fs.readFileSync(path.join(outDir, expectedFiles['manifest'])).toString('utf-8'));
    const ghSize = expectedSizes['googleHome'];
    const glSize = expectedSizes['googleLoading'];
    t.deepEqual(manifest['icons'].map((i) => [i['src'], i['sizes']]).sort(),
        [[expectedFiles['googleHome'], `${ghSize}x${ghSize}`],
          [expectedFiles['googleLoading'], `${glSize}x${glSize}`]].sort());

    if (extraManifest) {
      const {icons, ...manifestWithoutIcons} = manifest;
      const _icons = icons;
      t.deepEqual(extraManifest, manifestWithoutIcons);
    }
  }
};

test('generates from test svg', async (t) => {
  const outDir = path.join(genDir, 'fromSvg');
  const output = await genFavicon(testSvg, outDir);

  await assertCorrectIcons(t, output, outDir);
});

test('generates from test png', async (t) => {
  const outDir = path.join(genDir, 'fromPng');
  const output = await genFavicon('test/img/testing.png', outDir);

  await assertCorrectIcons(t, output, outDir, {expectSvg: false});
});

test('generates without manifest', async (t) => {
  const outDir = path.join(genDir, 'withoutManifest');
  const output = await genFavicon(testSvg, outDir, {generateManifest: false});

  await assertCorrectIcons(t, output, outDir, {expectManifest: false});
});

test('generates with extra manifest data', async (t) => {
  const outDir = path.join(genDir, 'withExtraManifest');
  const extraData = {'name': 'test name', 'background_color': 'white'};
  const output = await genFavicon(testSvg, outDir,
      {generateManifest: true, manifestData: extraData});

  await assertCorrectIcons(t, output, outDir, {extraManifest: extraData});
});

test('generates from arbitrarily sized square pngs', async (t) => {
  const sizes = [1, 2, 40, 64, 80, 812, 4096];

  await Promise.all(sizes.map(async (dim) => {
    const outDir = path.join(genDir, `fromGenPng${dim}`);
    const srcFile = path.join(genDir, `src-${dim}.png`);
    await sharp({
      create: {
        width: dim,
        height: dim,
        channels: 4,
        background: {r: 128, g: 0, b: 255, alpha: 0.75},
      },
    })
        .png()
        .toFile(srcFile);
    const output = await genFavicon(srcFile, outDir, {appleIconBgColor: '#f00'});

    await assertCorrectIcons(t, output, outDir, {expectSvg: false});
  }));
});

test('generates from arbitrarily sized square pngs with apple padding override', async (t) => {
  const sizes = [1, 2, 40, 64, 80, 812, 4096];

  await Promise.all(sizes.map(async (dim) => {
    const outDir = path.join(genDir, `fromGenPng2-${dim}`);
    const srcFile = path.join(genDir, `src2-${dim}.png`);
    await sharp({
      create: {
        width: dim,
        height: dim,
        channels: 4,
        background: {r: 128, g: 0, b: 255, alpha: 0.75},
      },
    })
        .png()
        .toFile(srcFile);
    const output = await genFavicon(srcFile, outDir, {appleIconBgColor: '#f00', appleIconPadding: 0});

    await assertCorrectIcons(t, output, outDir, {expectSvg: false});
  }));
});

test('caches given same src and dest', async (t) => {
  const outDir = path.join(genDir, 'cacheSameTest');
  const output = await genFavicon(testSvg, outDir);

  await assertCorrectIcons(t, output, outDir);

  await fs.promises.rm(outDir, {recursive: true, force: true});
  // should hit in-mem cache & not create new files
  const output2 = await genFavicon(testSvg, outDir);

  t.deepEqual(output, output2);
  t.false(fs.existsSync(path.join(outDir, expectedFiles['svg'])));
  t.false(fs.existsSync(path.join(outDir, expectedFiles['ico'])));
  t.false(fs.existsSync(path.join(outDir, expectedFiles['apple'])));
  t.false(fs.existsSync(path.join(outDir, expectedFiles['googleHome'])));
  t.false(fs.existsSync(path.join(outDir, expectedFiles['googleLoading'])));
  t.false(fs.existsSync(path.join(outDir, expectedFiles['manifest'])));
});

test('does not cache if skipCache specified', async (t) => {
  const outDir = path.join(genDir, 'cacheSkipTest');
  const output = await genFavicon(testSvg, outDir);

  await assertCorrectIcons(t, output, outDir);

  await fs.promises.rm(outDir, {recursive: true, force: true});
  const output2 = await genFavicon(testSvg, outDir, {skipCache: true});

  t.deepEqual(output, output2);
  await assertCorrectIcons(t, output2, outDir);
});

test('does not cache if file modified', async (t) => {
  const srcFile = path.join(genDir, 'new-icon.png');
  const mkIcon = async (color) => {
    await sharp({
      create: {
        width: 128,
        height: 128,
        channels: 4,
        background: color,
      },
    })
        .png()
        .toFile(srcFile);
  };

  const outDir = path.join(genDir, 'cacheModTest');
  await mkIcon('red');
  const output = await genFavicon(srcFile, outDir);

  await assertCorrectIcons(t, output, outDir, {expectSvg: false});

  await fs.promises.rm(outDir, {recursive: true, force: true});
  await mkIcon('blue');
  const output2 = await genFavicon(srcFile, outDir);

  t.deepEqual(output, output2);
  await assertCorrectIcons(t, output2, outDir, {expectSvg: false});
});

test('does not cache if options differ', async (t) => {
  const outDir = path.join(genDir, 'cacheOptionsTest');
  const output = await genFavicon(testSvg, outDir, {appleIconBgColor: 'red'});

  await assertCorrectIcons(t, output, outDir);

  await fs.promises.rm(outDir, {recursive: true, force: true});
  const output2 = await genFavicon(testSvg, outDir, {appleIconBgColor: 'blue'});

  t.deepEqual(output, output2);
  await assertCorrectIcons(t, output2, outDir);
});

test('generates html with svg', async (t) => {
  const files = {
    'svg': '/favicon.svg',
    'ico': '/favicon.ico',
    'apple': '/apple-touch-icon.png',
    'manifest': '/manifest.webmanifest',
  };

  const expected = `
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
`;

  t.is(expected, await genHtml(files));
});

test('generates html without svg', async (t) => {
  const files = {
    'ico': '/favicon.ico',
    'apple': '/apple-touch-icon.png',
    'manifest': '/manifest.webmanifest',
  };

  const expected = `
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
`;

  t.is(expected, await genHtml(files));
});

test('generates html without manifest', async (t) => {
  const files = {
    'svg': '/favicon.svg',
    'ico': '/favicon.ico',
    'apple': '/apple-touch-icon.png',
  };

  const expected = `
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
`;

  t.is(expected, await genHtml(files));
});
