# unwrap-element

[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]

> Easy solve problem of popup scroll freeze on mobile.

## Motivation

The mobile popup has a page scrolling problem because the scrolling is not in the body itself. This module expands the
element and hides everything around it, as like the element becomes the page itself and removes the page scrolling
problem.

## How to use it (few variants)

### As script in browser
Add script
```html
<script src=".../dist/unwrap-element.js"></script>
```
Use it
```html
<div id="targetElement">Unwrap Test</div>

<script>
    const destroyUnwrap = unwrapElement('#targetElement');
    // TargetElement should place on all page
    // To revert all to previous state call destroyUnwrap();
    setTimeout(() => destroyUnwrap(), 5000);
</script>
```

### As imported module

```javascript
import unwrapElement from "unwrap-element";

const destroyUnwrap = unwrapElement('#targetElement');
// TargetElement should place on all page
// To revert all to previous state call destroyUnwrap();
setTimeout(() => destroyUnwrap(), 5000);
```

## Api reference
```javascript
const destroyUnwrap = unwrapElement(nodeOrSelector);
```

## How it works

This module:

* traverse whole webpack config tree
* find json-paths to scss-loader configs by matching ```{loader: 'scss-loader'}```
* insert resolve-url-loader just before scss-loader configs in nuxt webpack config.
* reconfigure scss-loader for adding source-maps

Before:

```javascript
{ // ... Webpack config
  module: {
    // ...
    rules: [
      // ...
      {
        test: /\.scss$/,
        use: [
          // ... Other loaders
          { loader: 'scss-loader' }
        ]
      }
    ]
  }
}
```

After:

```javascript
{ // ... Webpack config
  module: {
    // ...
    rules: [
      // ...
      {
        test: /\.scss$/,
        use: [
          // ... Other loaders
          { loader: 'resolve-url-loader' },
          { loader: 'scss-loader', options: { sourceMap: true } }
        ]
      }
    ]
  }
}
```

## Requirements

You need to ensure that you have `resolve-url-loader` installed:

```bash
npm install --save-dev resolve-url-loader
```

## Setup

1. Add `nuxt-resolve-url-loader` dependency to your project

```bash
npm install --save-dev nuxt-resolve-url-loader
```

2. Add `nuxt-resolve-url-loader` to the `buildModules` section of `nuxt.config.js`

```js
export default {
  buildModules: [
    // Simple usage
    'nuxt-resolve-url-loader',

    // With options
    ['nuxt-resolve-url-loader', { /* options for resolve-url-loader */ }]
  ]
}
```

:warning: If you are using Nuxt **< v2.9** you have to install the module as a `dependency` (No `--dev` or `--save-dev`
flags) and use `modules` section in `nuxt.config.js` instead of `buildModules`.

## Options

See [resolve-url-loader options](https://www.npmjs.com/package/resolve-url-loader#options) for the complete list of
options available. These options are passed through to the `resolve-url-loader` directly.

## License

[MIT License](./LICENSE)

Copyright (c) Igor Pylypenko

<!-- Badges -->

[npm-downloads-src]: https://img.shields.io/npm/dt/nuxt-resolve-url-loader.svg

[npm-downloads-href]: https://npmjs.com/package/nuxt-resolve-url-loader

[license-src]: https://img.shields.io/npm/l/nuxt-resolve-url-loader.svg

[license-href]: https://npmjs.com/package/nuxt-resolve-url-loader