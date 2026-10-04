import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync } from 'fflate';
import { inspectZip, compileZip, inspectZwf } from '../src/format.mjs';

const text = new TextEncoder();
function archive(extra = {}) {
  return zipSync({ 'index.html': text.encode('<!doctype html><title>Game</title>'), ...extra });
}
function centralOffset(bytes, index = 0) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  let offset = view.getUint32(end + 16, true);
  for (let i = 0; i < index; i++) {
    offset += 46 + view.getUint16(offset + 28, true) + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
  }
  return offset;
}

test('rejects special file metadata before interpreting an entry as a game asset', () => {
  const bytes = archive();
  new DataView(bytes.buffer).setUint32(centralOffset(bytes) + 38, 0x10000000, true);
  assert.throws(() => inspectZip(bytes), /special|unsupported ZIP entry/i);
});

test('rejects Unicode-normalization collisions instead of assigning two member identities', () => {
  const bytes = archive({ 'caf\u00e9.txt': text.encode('one'), 'cafe\u0301.txt': text.encode('two') });
  assert.throws(() => inspectZip(bytes), /duplicate|collision/i);
});

test('rejects a central-directory entry with conflicting local integrity metadata', () => {
  const bytes = archive();
  const view = new DataView(bytes.buffer);
  const central = centralOffset(bytes);
  const local = view.getUint32(central + 42, true);
  view.setUint32(local + 14, (view.getUint32(local + 14, true) ^ 1) >>> 0, true);
  assert.throws(() => inspectZip(bytes), /headers disagree|integrity/i);
});

test('supports nested asset names and preserves deterministic compile/inspect digests', async () => {
  const input = archive({ 'assets/one/icon.png': new Uint8Array([1, 2, 3]), 'assets/two/icon.png': new Uint8Array([4, 5]) });
  const first = await compileZip(input, { title: 'Budget game' });
  const second = await compileZip(input, { title: 'Budget game' });
  assert.deepEqual(first.bytes, second.bytes);
  const restored = await inspectZwf(first.bytes);
  assert.deepEqual(restored.zip, input);
  assert.deepEqual(restored.manifest.files.map(file => file.path), ['index.html', 'assets/one/icon.png', 'assets/two/icon.png']);
});

test('enforces actual output when both local and central uncompressed sizes lie', () => {
  const bytes=archive({'large.txt':text.encode('x'.repeat(4*1024**2))});
  const view=new DataView(bytes.buffer);const at=centralOffset(bytes,1),local=view.getUint32(at+42,true);
  view.setUint32(at+24,1,true);view.setUint32(local+22,1,true);
  assert.throws(()=>inspectZip(bytes),/Actual ZIP decompression budget exceeded/);
});
function withDescriptor(magic) {
 const input=archive();const initial=new DataView(input.buffer);const at=centralOffset(input);const dataEnd=at;
 const descriptorLength=magic?16:12;
 const result=new Uint8Array(input.length+descriptorLength);result.set(input.subarray(0,dataEnd));result.set(input.subarray(dataEnd),dataEnd+descriptorLength);
 const view=new DataView(result.buffer);let descriptor=dataEnd;
 if(magic){view.setUint32(descriptor,0x08074b50,true);descriptor+=4;}
 for(const [source,dest] of [[16,0],[20,4],[24,8]])view.setUint32(descriptor+dest,initial.getUint32(at+source,true),true);
 view.setUint16(6,view.getUint16(6,true)|8,true);view.setUint32(14,0,true);view.setUint32(18,0,true);view.setUint32(22,0,true);
 view.setUint16(at+descriptorLength+8,view.getUint16(at+descriptorLength+8,true)|8,true);
 view.setUint32(result.length-6,at+descriptorLength,true);
 return {bytes:result,descriptor};
}
test('accepts and verifies signed and unsigned ZIP data descriptors',()=>{
 for(const magic of [true,false]) {
  const {bytes,descriptor}=withDescriptor(magic);assert.equal(inspectZip(bytes).entry,'index.html');
  const view=new DataView(bytes.buffer);view.setUint32(descriptor+8,view.getUint32(descriptor+8,true)+1,true);
  assert.throws(()=>inspectZip(bytes),/descriptor integrity/);
 }
});
test('rejects file/directory collisions and empty files still round-trip',async()=>{
 assert.throws(()=>inspectZip(archive({'assets.txt':text.encode('file'),'assets.txt/icon.png':new Uint8Array([1])})),/collision/);
 const input=archive({'empty.txt':new Uint8Array(0)});const result=await compileZip(input);assert.deepEqual((await inspectZwf(result.bytes)).zip,input);
});

test('rejects non-ASCII names without their UTF-8 encoding flag',()=>{
 const bytes=archive({'caf\u00e9.txt':text.encode('asset')});const view=new DataView(bytes.buffer),at=centralOffset(bytes,1),local=view.getUint32(at+42,true);
 view.setUint16(at+8,view.getUint16(at+8,true)&~0x800,true);view.setUint16(local+6,view.getUint16(local+6,true)&~0x800,true);
 assert.throws(()=>inspectZip(bytes),/UTF-8 flag/);
});
test('rejects unaccounted trailing compressed bytes and preserves ordinary ZIP comments',()=>{
 const input=archive();const original=new DataView(input.buffer);const at=centralOffset(input);
 const result=new Uint8Array(input.length+1);result.set(input.subarray(0,at));result[at]=0;result.set(input.subarray(at),at+1);
 const view=new DataView(result.buffer),compressed=original.getUint32(at+20,true)+1;
 view.setUint32(18,compressed,true);view.setUint32(at+1+20,compressed,true);view.setUint32(result.length-6,at+1,true);
 assert.throws(()=>inspectZip(result),/trailing DEFLATE/);
 const comment=text.encode('ZUKU game archive');const commented=new Uint8Array(input.length+comment.length);commented.set(input);commented.set(comment,input.length);
 new DataView(commented.buffer).setUint16(input.length-2,comment.length,true);
 assert.equal(inspectZip(commented).entry,'index.html');
});

test('malformed container JSON and member shapes report a format error',async()=>{
 const result=await compileZip(archive());
 const asContainer=json=>{
  const body=text.encode(json),zip=archive();const bytes=new Uint8Array(16+body.length+zip.length),view=new DataView(bytes.buffer);
  bytes.set(text.encode('ZWF2'));view.setUint16(4,2,true);view.setUint32(8,body.length,true);view.setUint32(12,zip.length,true);bytes.set(body,16);bytes.set(zip,16+body.length);return bytes;
 };
 for(const json of ['{','null','[]',JSON.stringify({...result.manifest,files:[null]})])await assert.rejects(inspectZwf(asContainer(json)),{name:'ZwfError'});
});
