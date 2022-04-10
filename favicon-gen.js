const fs = require('fs');
const fsp = fs.promises;
const sharp = require('sharp');
const path = require('path');
const toIco = require('png-to-ico');

// derived from https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs
// (2022 update)
// ico: 64/32/16
// apple png: 180x180 (140x140 + 20px bg padding preferred)
// manifest with:
// google home screen png: 192x192
// google loading png: 512x512

const destSvg = '/favicon.svg';
const destIco = '/favicon.ico';
const destApple = '/apple-touch-icon.png';
const destGoogleHome = '/icon-192.png';
const destGoogleLoading = '/icon-512.png';
const destManifest = '/manifest.webmanifest';

const icoSizes = [64, 32, 16];
const appleSize = 180;
const appleSurround = 20;
const googleHomeSize = 192;
const googleLoadSize = 512;

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

const appleBuf = (bgColor) => async (fileName, fileMeta) =>
  resizedSharp(fileName, fileMeta, appleSize - (2 * appleSurround))
      .then((s) => s.extend({
        top: appleSurround,
        bottom: appleSurround,
        left: appleSurround,
        right: appleSurround,
        background: bgColor,
      }).toBuffer());

const defaultOpts = {
  appleIconBgColor: 'white',
  manifestData: {},
  generateManifest: true,
};

module.exports = async (srcFile, outputDir, opts) => {
  const {appleIconBgColor, manifestData, generateManifest} = Object.assign({}, defaultOpts, opts);

  if (!fs.existsSync(outputDir)) {
    await fsp.mkdir(outputDir);
  }
  const writeTo = (dest) => (buf) => fsp.writeFile(path.join(outputDir, dest), buf);

  await fsp.stat(srcFile);
  const srcMetadata = await sharp(srcFile).metadata();
  const srcIsSvg = srcMetadata.format === 'svg';

  const {width, height} = srcMetadata;
  if (width !== height) {
    throw new Error('source favicon must be square');
  }

  if (srcIsSvg) {
    await fsp.copyFile(srcFile, path.join(outputDir, destSvg));
  }

  await Promise.all([
    icoBuf(srcFile, srcMetadata).then(writeTo(destIco)),
    appleBuf(appleIconBgColor)(srcFile, srcMetadata).then(writeTo(destApple)),
    resizedSharp(srcFile, srcMetadata, googleHomeSize).then((s) => s.toBuffer()).then(writeTo(destGoogleHome)),
    resizedSharp(srcFile, srcMetadata, googleLoadSize).then((s) => s.toBuffer()).then(writeTo(destGoogleLoading)),
  ]);

  if (generateManifest) {
    const manifest = Object.assign({}, manifestData, {
      'icons': [
        {'src': destGoogleHome, 'type': 'image/png', 'sizes': `${googleHomeSize}x${googleHomeSize}`},
        {'src': destGoogleLoading, 'type': 'image/png', 'sizes': `${googleLoadSize}x${googleLoadSize}`},
      ],
    });
    await fsp.writeFile(path.join(outputDir, destManifest), JSON.stringify(manifest), 'utf-8');
  }

  return Object.assign(
    generateManifest ? {'manifest': destManifest} : {},
    srcIsSvg ? {'svg': destSvg} : {},
    {
      'ico': destIco,
      'apple': destApple,
      'googleHome': destGoogleHome,
      'googleLoading': destGoogleLoading,
    },
  );
};

