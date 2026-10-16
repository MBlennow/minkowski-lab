import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));

/** Bundle the editable sources into the complete offline application. */
export async function build() {
  const [template, styles, script] = await Promise.all([
    readFile(new URL('../src/index.template.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/app.js', import.meta.url), 'utf8'),
  ]);
  for (const marker of ['<!-- INLINE_STYLES -->', '<!-- INLINE_SCRIPT -->']) {
    if (template.split(marker).length !== 2) {
      throw new Error(`The HTML template must contain exactly one ${marker} marker.`);
    }
  }
  // Callback replacements preserve literal dollar signs in JavaScript and CSS.
  const html = template
    .replace('<!-- INLINE_STYLES -->', () => `<style>${styles}</style>`)
    .replace('<!-- INLINE_SCRIPT -->', () => `<script>${script}</script>`);
  await writeFile(new URL('../index.html', import.meta.url), html, 'utf8');
  return html;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await build();
  console.log('Built index.html — complete, standalone, and ready to open offline.');
}
