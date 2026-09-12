#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { compileZip, inspectZwf } from './format.mjs';

const [command, source, ...args] = process.argv.slice(2);
try {
  if (!source || !['compile', 'inspect'].includes(command)) {
    console.log('Usage: zwf compile game.zip -o game.zwf [--title "Game title"]\n       zwf inspect game.zwf');
    process.exitCode = command === '--help' ? 0 : 1;
  } else if (command === 'inspect') {
    const { manifest } = await inspectZwf(await readFile(source));
    console.log(JSON.stringify(manifest, null, 2));
  } else {
    const outputIndex = args.indexOf('-o'), titleIndex = args.indexOf('--title');
    if (outputIndex < 0 || !args[outputIndex + 1]) throw new Error('Provide an output path with -o');
    const { bytes, manifest } = await compileZip(await readFile(source), { title: titleIndex >= 0 ? args[titleIndex + 1] : '' });
    await writeFile(args[outputIndex + 1], bytes, { flag: 'wx' });
    console.log(`Compiled ${manifest.files.length} files (${bytes.length} bytes) → ${args[outputIndex + 1]}`);
  }
} catch (error) { console.error(`zwf: ${error.message}`); process.exitCode = 1; }
