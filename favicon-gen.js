const fs = require('fs');
const fsp = fs.promises;
const sharp = require('sharp');
const path = require('path');
const toIco = require('png-to-ico');
const deepEq = require('fast-deep-equal');

// derived from https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs
// (2026 update)
// ico: 64/32/16
// apple png: 180x180 (140x140 + 20px bg padding preferred)
// manifest with:
// google home screen png: 192x192
// google loading png: 512x512
// maskable png: 512x512 (408×408 + 52px bg padding preferred)

const destSvg = '/favicon.svg';
const destIco = '/favicon.ico';
const destApple = '/apple-touch-icon.png';
const destGoogleHome = '/icon-192.png';
const destGoogleLoading = '/icon-512.png';
const destManifest = '/manifest.webmanifest';
const destMaskable = '/icon-mask.png';

const icoSizes = [64, 32, 16];
const appleSize = 180;
const appleSurround = 20;
const googleHomeSize = 192;
const googleLoadSize = 512;
const maskableSize = 512;
const maskableSurround = 52;

const cacheByFile = {};

// expects square img
const resizedSharp = async (fileName, fileMeta, newDim) => {
  const opts = fileMeta.density ? {density: (newDim / fileMeta.width) * fileMeta.density} : {};
  return sharp(fileName, opts).resize(newDim, newDim).png();
};

// n.b. this seems to generate .ico files that 'identify' cannot handle?
// identify: unexpected end-of-file : No such file or directory @ error/icon.c/ReadICONImage/654.
// .ico file seems fine per https://redketchup.io/icon-editor
const icoBuf = async (fileName, fileMeta, dims = icoSizes) =>
  Promise.all(dims.map((dim) => resizedSharp(fileName, fileMeta, dim)
      .then((s) => s.ensureAlpha().toBuffer())))
      .then(toIco);

const appleBuf = (bgColor, padding) => async (fileName, fileMeta) =>
  resizedSharp(fileName, fileMeta, appleSize - (2 * padding))
      .then((s) => s.extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: bgColor,
      }).toBuffer());

const maskableBuf = (bgColor, padding) => async (fileName, fileMeta) =>
  resizedSharp(fileName, fileMeta, maskableSize - (2 * padding))
      .then((s) => s.extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: bgColor,
      }).toBuffer());

const defaultOpts = {
  iconBgColor: 'white',
  appleIconPadding: appleSurround,
  maskableIconPadding: maskableSurround,
  manifestData: {},
  generateManifest: true,
  skipCache: false,
};

module.exports = async (srcFile, outputDir, urlPath, opts) => {
  const fullOpts = Object.assign({}, defaultOpts, opts);
  const {iconBgColor, appleIconPadding, maskableIconPadding, manifestData, generateManifest, skipCache} = fullOpts;

  if (!fs.existsSync(outputDir)) {
    await fsp.mkdir(outputDir);
  }
  const writeTo = (dest) => (buf) => fsp.writeFile(path.join(outputDir, dest), buf);

  const mtime = (await fsp.stat(srcFile)).mtime;
  const [cachedMtime, cachedOpts] = cacheByFile[`${srcFile}|${outputDir}`] || [0, {}];

  const srcMetadata = await sharp(srcFile).metadata();
  const srcIsSvg = srcMetadata.format === 'svg';

  const {width, height} = srcMetadata;
  if (width !== height) {
    throw new Error('source favicon must be square');
  }
  if (appleIconPadding < 0 || ((2 * appleIconPadding) >= appleSize)) {
    throw new Error(`Apple icon padding must be >=0 and small enough to generate a ${appleSize}x${appleSize} image`);
  }
  if (maskableIconPadding < 0 || ((2 * maskableIconPadding) >= maskableSize)) {
    throw new Error(
        `Maskable icon padding must be >=0 and small enough to generate a ${maskableSize}x${maskableSize} image`,
    );
  }

  if (mtime > cachedMtime || (! deepEq(fullOpts, cachedOpts)) || skipCache) {
    if (srcIsSvg) {
      await fsp.copyFile(srcFile, path.join(outputDir, destSvg));
    }

    await Promise.all([
      icoBuf(srcFile, srcMetadata).then(writeTo(destIco)),
      appleBuf(iconBgColor, appleIconPadding)(srcFile, srcMetadata).then(writeTo(destApple)),
    ]);

    if (generateManifest) {
      await Promise.all([
        maskableBuf(iconBgColor, maskableIconPadding)(srcFile, srcMetadata).then(writeTo(destMaskable)),
        resizedSharp(srcFile, srcMetadata, googleHomeSize).then((s) => s.toBuffer()).then(writeTo(destGoogleHome)),
        resizedSharp(srcFile, srcMetadata, googleLoadSize).then((s) => s.toBuffer()).then(writeTo(destGoogleLoading)),
      ]);
      const manifest = Object.assign({}, manifestData, {
        'icons': [
          {'src': destGoogleHome, 'type': 'image/png', 'sizes': `${googleHomeSize}x${googleHomeSize}`},
          {'src': destGoogleLoading, 'type': 'image/png', 'sizes': `${googleLoadSize}x${googleLoadSize}`},
          {
            'src': destMaskable,
            'type': 'image/png',
            'sizes': `${maskableSize}x${maskableSize}`,
            'purpose': 'maskable',
          },
        ],
      });
      await fsp.writeFile(path.join(outputDir, destManifest), JSON.stringify(manifest), 'utf-8');
    }

    cacheByFile[`${srcFile}|${outputDir}`] = [mtime, fullOpts];
  }

  const dest = Object.assign(
    generateManifest ? {
      'manifest': destManifest,
      'googleHome': destGoogleHome,
      'googleLoading': destGoogleLoading,
      'maskable': destMaskable,
    } : {},
    srcIsSvg ? {'svg': destSvg} : {},
    {
      'ico': destIco,
      'apple': destApple,
    },
  );

  for (const key in dest) {
    if (!Object.hasOwn(dest, key)) continue;
    dest[key] = path.join(urlPath, dest[key]);
  }
  return dest;
};
