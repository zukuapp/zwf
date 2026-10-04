# ZWF HTML5 profile 2

Version: 2.0. Profile identifier: `html5-sandbox/2`. File extension: `.zwf`. Media type: `application/zwf`.

All integer fields are unsigned little-endian. A file has exactly three consecutive sections: a 16-byte header, UTF-8 JSON manifest, and an ordinary ZIP archive. Trailing bytes are forbidden.

| Offset | Width | Meaning |
| --- | --- | --- |
| 0 | 4 | ASCII `ZWF2` |
| 4 | 2 | Version, exactly `2` |
| 6 | 2 | Reserved flags, exactly `0` |
| 8 | 4 | Manifest length in bytes |
| 12 | 4 | ZIP length in bytes |

The manifest requires `format: "zwf"`, `version: 2`, `profile: "html5-sandbox/2"`, `entry_point`, `title`, `permissions: { network: "package-only", storage: "none" }`, `zip_sha256` and `files`. Digests are lowercase hexadecimal SHA-256. Each file record contains `path`, uncompressed `size` and `sha256`, in ZIP central directory order. Directory entries are omitted. The entrypoint is root `index.html`/`index.htm`, or that file under exactly one wrapper directory. Imports, CSS URLs and fetch paths are relative to their original package locations.

ZIP admission rejects traversal, absolute/drive paths, backslashes, control characters, URL escape characters, case-colliding paths, symlinks, encryption, split archives, ZIP64, overlapping entries, conflicting local/central headers, native executable signatures and unsupported asset extensions. Stored and deflate methods are supported. CRC-32 is checked for each member before compilation. Limits: 8,000 entries; 500 MiB compressed ZIP; 128 MiB per file; 512 MiB total expanded; 2 MiB manifest. Entries at least 1 MiB cannot exceed an 80:1 expansion ratio. Parsers inspect metadata before decompression and reject declared and actual size mismatches.

Paths also reject NFC aliases, file/directory collisions and depth above 64. Non-ASCII names require the ZIP UTF-8 flag. Local CRC/size fields and optional signed or unsigned data descriptors must agree with the central directory. Entries occupy one contiguous local-file region; self-extracting prefixes and hidden gaps are outside this game profile. Ordinary ZIP comments remain supported.

Output limits are checked during streaming DEFLATE, including when local and central uncompressed sizes agree with each other but lie about actual output. `fflate` is pinned to `0.8.3`; final-block and trailing-data checks are covered by regression tests. Invalid container JSON/member shapes produce `ZwfError`.

Recompiling identical ZIP bytes with identical options yields identical ZWF2 bytes. Integrity hashes detect corruption; they do **not** establish the author's identity and are not digital signatures.

## Mandatory player behavior

1. Validate the container, manifest, archive boundaries, paths, entrypoint and digests before use. Do not execute package code on the server.
2. Serve package files with correct MIME types, `nosniff`, no referrer and CORS for opaque-origin resource requests. Protect package routes with the same content access checks as the game. Never expose arbitrary filesystem paths.
3. Embed only with `sandbox="allow-scripts allow-pointer-lock"`. Never grant `allow-same-origin`, popups, downloads, top navigation or forms. Apply a matching **response-header** CSP sandbox so opening HTML directly cannot acquire the platform origin.
4. CSP defaults to `default-src 'none'`, `base-uri 'none'`, `form-action 'none'`, `object-src 'none'`, `frame-src 'none'`. Script/style/image/media/font/connect sources are limited to the exact game package asset directory, with inline scripts/styles and data/blob resources as needed. Do not allow the whole platform origin via `'self'`. WebAssembly compilation may use `'wasm-unsafe-eval'`; general JavaScript `'unsafe-eval'` is not granted.
5. Deny camera, microphone, geolocation, payment, USB/serial/Bluetooth, clipboard, screen capture, storage-access and credential APIs. Never forward account credentials, host filesystem or storage capabilities into a game.
6. Lifecycle messages contain `channel: "zuku-html5"`, `version: 1`, a per-mount random `session`, and `action: "ready" | "error"`. The parent must check the exact iframe `contentWindow`, origin `"null"`, session and allowed action. Messages provide status only and never authorize host operations.
7. Private package playback uses an opaque random, content-scoped asset ticket issued only after access checks. Tickets expire after one hour, are checked again against current content access on every file request, and never authorize account APIs. The manifest response is private and not cacheable. A server restart invalidates tickets; retry obtains a fresh session.
8. Revoke mounts, event listeners, timers and requests when changing games or unmounting. Errors must be visible; do not report a fallback background canvas as successful gameplay.

These constraints isolate platform data and browser privileges. They do not impose deterministic CPU/GPU/memory quotas, and current browser CSP does not reliably prohibit a game from navigating its own iframe. Deployments requiring total outbound network denial need an additional browser/network isolation layer. The ZWF2 permission `package-only` describes the resource-fetch policy, not a firewall guarantee.
