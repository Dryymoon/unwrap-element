# unwrap-element (TypeScript)

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

## License

[MIT License](./LICENSE)

Copyright (c) Igor Pylypenko

<!-- Badges -->

[npm-downloads-src]: https://img.shields.io/npm/dt/nuxt-resolve-url-loader.svg

[npm-downloads-href]: https://npmjs.com/package/nuxt-resolve-url-loader

[license-src]: https://img.shields.io/npm/l/nuxt-resolve-url-loader.svg

[license-href]: https://npmjs.com/package/nuxt-resolve-url-loader
