# Eleventy Favicon Generation

[`eleventy-plugin-gen-favicons`](https://www.npmjs.com/package/eleventy-plugin-gen-favicons)

An Eleventy plugin to generate favicons based on the [2022 best practices](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs).

Include as a `{% favicons 'source-image.svg' %}` in your template.  On build, all relevant favicons will be generated, and HTML referencing the icons will be placed in your template.

Given a single square input icon file (preferably `.svg`), the following is generated:
- `/favicon.svg` (only if a svg is provided)
- `/favicon.ico` - 64x64/32x32/16x16 legacy icon
- `/apple-touch-icon.png` - 180x180 Apple home screen icon including 20px colored padding
- `/icon-192.png` - Google home screen icon
- `/icon-512.png` - Google loading screen
- `/manifest.webmanifest` - Manifest linking the Google icons; can be customized with additional data

## Installation

Available on [npm](https://www.npmjs.com/package/eleventy-plugin-gen-favicons).

```
npm install --save-dev eleventy-plugin-gen-favicons
```

In `.eleventy.js` (or your config file if differently named), use `addPlugin`:

```js
// .eleventy.js
const faviconsPlugin = require("eleventy-plugin-gen-favicons");

module.exports = function(eleventyConfig) {
  eleventyConfig.addPlugin(faviconsPlugin, {});
};
```

**NOTE** If you already have `module.exports`, only copy the `require` and `addPlugin` lines, as with all other plugins.

The plugin accepts a few options (replace `{}` as necessary):
- `outputDir`: default `./_site` -- where to generate the icons; should match the eleventy output directory
- `manifestData`: default `{}` -- additional data to include in the `.webmanifest` (e.g. `{'name': 'My Website'}`)
- `generateManifest`: default `true` -- set to `false` to disable manifest generation (if you're already generating a manifest separately)

Example:

```js
  eleventyConfig.addPlugin(faviconsPlugin, {'outputDir': './generated_site', 'manifestData': {'name': 'My Website'}});
```

## Usage

Include the `favicons` shortcode somewhere within `<head>` in your template (all languages except **Handlebars** are supported):

```njk
<head>
{% favicons 'my-source-image.svg', appleIconBgColor='#123' %}
</head>
```

**NOTE** Do not use multiple `favicons` shortcodes with different images or bg colors.  Favicons are site-wide and this will result in undefined behavior.  It is fine to conditionally set a favicon, as long as it's site-wide.

The shortcode accepts additional options:
- `appleIconBgColor`: default `'white'` -- the color to use for the 20px border on the Apple icon; accepts anything that can be parsed by `color`, such as `'white'`, `'#fff'`, `{r: 128, g: 0, b: 255, alpha: 0.75}`, etc
- `manifestData`: default `{}` -- additional data to include in the `.webmanifest` (e.g. `{'name': 'My Website'}`); overrides the plugin setting of the same name
- `generateManifest`: default `true` -- set to `false` to disable manifest generation (if you're already generating a manifest separately); overrides the plugin setting of the same name

Examples:

```njk
{% favicons 'favicon.svg' %}
{% favicons 'favicon.png' %}
{% favicons 'favicon.svg', appleIconBgColor='#000' %}
{% favicons 'favicon.svg', appleIconBgColor='black', manifestData={name:'My Website'} %}
{% favicons 'favicon.svg', appleIconBgColor='#f00', generateManifest=false %}
```

Example generated HTML:

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
```

## Security

This package uses `sharp` and `png-to-ico` and at the time of publish shows no vulnerabilities with `npm audit`.  It is fully tested and should not alter any files other than the favicons it generates.

## More Favicons

This generates the ["Six files that fit most needs" for favicons in 2022](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs).  For sites that require more icons, a custom solution based on the [`favicons` package](https://www.npmjs.com/package/favicons) is recommended.

## Contributing

PRs to the [GitHub repo](https://github.com/NJAldwin/eleventy-plugin-gen-favicons) are welcome.  Please make sure the tests pass.
