import {cp, mkdir, readdir} from 'node:fs/promises';

const source = new URL('../dist/', import.meta.url);
const destination = new URL('../public/', import.meta.url);
await mkdir(destination, {recursive: true});
for (const entry of await readdir(source, {withFileTypes: true})) {
  if (entry.name !== 'assets' && !/\.(css|mjs)$/.test(entry.name)) continue;
  await cp(new URL(entry.name, source), new URL(entry.name, destination), {recursive: entry.isDirectory()});
}
