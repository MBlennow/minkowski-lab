import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';
import { build } from './build.mjs';

const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
new Script(source, { filename: 'src/app.js' });
const html = await build();
const embedded = html.match(/<script id="embedded-scene" type="application\/json">([\s\S]*?)<\/script>/);
if (!embedded) throw new Error('The embedded-scene JSON element is missing.');
JSON.parse(embedded[1]);
if (/<script\b[^>]*\bsrc\s*=|<link\b[^>]*\brel\s*=\s*["']stylesheet/i.test(html)) {
  throw new Error('The standalone build must embed its scripts and styles.');
}
console.log('Passed: JavaScript syntax, source bundling, scene JSON, and embedded scripts/styles.');
console.log('These checks do not replace interactive browser testing.');
