# ZWF HTML5 compiler

ZWF packages HTML, JavaScript, CSS, WebAssembly and local assets for ZUKU Jump. Compile a ZIP export into a versioned `.zwf` artifact with a manifest and SHA-256 integrity checks. The default runtime is the browser's HTML5 engine.

The package is **not published to npm**. Install from this repository:

```sh
git clone https://github.com/zukuapp/zwf.git
cd zwf
npm ci
npm test
node src/cli.mjs compile game.zip -o game.zwf --title "My game"
node src/cli.mjs inspect game.zwf
```

`game.zip` must contain `index.html` at its root or in one wrapper directory. Bundle your application before compiling (for Vite, use a relative base such as `base: './'`). Package all scripts, fonts, media and data locally. The compiler never executes uploaded source. Output files are created exclusively; choose a new path if one exists.

For installation as a local npm-compatible package:

```sh
npm pack
npm install /absolute/path/to/zuku-zwf-0.1.0.tgz
```

```js
import { compileZip, inspectZwf } from '@zuku/zwf';
const { bytes, manifest } = await compileZip(zipBytes, { title: 'My game' });
const verified = await inspectZwf(bytes);
```

See [SPEC.md](./SPEC.md) for the binary layout and mandatory runtime boundary. `.zwf` is a package, not executable code outside a compatible player. The compiler is browser-compatible; the CLI uses Node.js 22 or later. ZUKU Jump Studio also compiles HTML ZIP uploads to this format.

The runtime uses an iframe with an opaque origin, a server-enforced CSP scoped to the game's own package files, and denied sensitive permissions. Games cannot access the parent DOM, account cookies, platform storage or account APIs. Network requests for bundled assets are allowed; external scripts, API requests, nested frames, forms and popups are blocked. This is browser isolation, not a CPU/memory quota or an operating-system sandbox. A game's own frame can navigate itself; embedding applications must not treat CSP as a complete network firewall.

Legacy ZWF1 binary timelines remain a separate format. Existing ZWF1 `WEBZ` HTML5 payloads are supported by Jump's server compatibility reader; this compiler emits ZWF2 only.
