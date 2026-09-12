import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { compileZip, inspectZwf, inspectZip, safePath } from '../src/format.mjs';

const pack = (files) => zipSync(Object.fromEntries(Object.entries(files).map(([path, text]) => [path, strToU8(text)])));
const game = () => pack({ 'index.html': '<!doctype html><html><head></head><body><script type="module" src="./assets/game.js"></script></body></html>', 'assets/game.js': 'document.body.dataset.started = "true";' });

test('compiles HTML5 ZIP deterministically and verifies every member', async () => {
  const zip = game(), first = await compileZip(zip, { title: 'Game' }), second = await compileZip(zip, { title: 'Game' });
  assert.deepEqual(first.bytes, second.bytes);
  const { manifest, zip: restored } = await inspectZwf(first.bytes);
  assert.equal(manifest.entry_point, 'index.html');
  assert.equal(manifest.profile, 'html5-sandbox/2');
  assert.deepEqual(manifest.permissions, { network: 'package-only', storage: 'none' });
  assert.deepEqual(restored, zip);
});

test('resolves a wrapper directory and preserves module and CSS asset paths', async () => {
  const { manifest } = await compileZip(pack({ 'release/index.html': '<script src="assets/game.js"></script>', 'release/assets/game.js': 'console.log(1)' }));
  assert.equal(manifest.entry_point, 'release/index.html');
  assert.deepEqual(manifest.files.map((file) => file.path), ['release/index.html', 'release/assets/game.js']);
});

test('rejects traversal, control characters, URL encodings and drive paths', () => {
  for (const path of ['../index.html', '/index.html', 'a/../index.html', 'a\\index.html', 'C:/index.html', '%2e%2e/index.html', 'a\0.js', './index.html']) assert.equal(safePath(path), false, path);
  assert.throws(() => inspectZip(pack({ '../index.html': '<html></html>' })), /Unsafe/);
});

test('rejects case-colliding paths, native binaries and missing entrypoints', () => {
  assert.throws(() => inspectZip(pack({ 'index.html': 'html', 'INDEX.html': 'html' })), /duplicate/);
  assert.throws(() => inspectZip(pack({ 'index.html': 'html', 'bad.js': 'MZ123' })), /Executable/);
  assert.throws(() => inspectZip(pack({ 'game.js': 'javascript' })), /index.html/);
});

test('rejects a compression bomb before decompression', () => {
  const zip = pack({ 'index.html': 'html', 'bomb.txt': 'A'.repeat(2 * 1024 ** 2) });
  assert.throws(() => inspectZip(zip), /decompression limits/);
});

test('rejects encrypted archives and central/local header disagreement', () => {
  const zip = game();
  const v = new DataView(zip.buffer), end = zip.length - 22, central = v.getUint32(end + 16, true);
  v.setUint16(central + 8, 1, true);
  assert.throws(() => inspectZip(zip), /Encrypted/);
  v.setUint16(central + 8, 0, true); v.setUint16(6, 1, true);
  assert.throws(() => inspectZip(zip), /headers disagree/);
});

test('rejects symlink ZIP entries', () => {
  const zip = game(), v = new DataView(zip.buffer), central = v.getUint32(zip.length - 6, true);
  v.setUint32(central + 38, 0xa1ff0000, true);
  assert.throws(() => inspectZip(zip), /linked/);
});

test('rejects truncated, corrupted and unsupported ZWF2 payloads', async () => {
  const { bytes } = await compileZip(game());
  await assert.rejects(inspectZwf(bytes.subarray(0, bytes.length - 1)), /size/);
  const corrupted = bytes.slice(); corrupted[corrupted.length - 25] ^= 1;
  await assert.rejects(inspectZwf(corrupted), /digest/);
  const unknownVersion = bytes.slice(); unknownVersion[4] = 3;
  await assert.rejects(inspectZwf(unknownVersion), /version|header/i);
});

test('rejects changed declared member digests even when ZIP hash still matches', async () => {
  const { bytes } = await compileZip(game());
  const text = new TextDecoder().decode(bytes.subarray(16, 16 + new DataView(bytes.buffer).getUint32(8, true)));
  const manifest = JSON.parse(text); manifest.files[0].sha256 = '0'.repeat(64);
  bytes.set(strToU8(JSON.stringify(manifest)), 16);
  await assert.rejects(inspectZwf(bytes), /member digest/);
});
