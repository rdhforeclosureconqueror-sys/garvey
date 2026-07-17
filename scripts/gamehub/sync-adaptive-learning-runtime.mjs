import { copyFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const source = path.join(root, 'public/gamehub/adaptive_learning.html');
const launchCopy = path.join(root, 'public/gamehub/adaptive_learning');

copyFileSync(source, launchCopy);

const sourceBytes = readFileSync(source);
const copyBytes = readFileSync(launchCopy);
if (!sourceBytes.equals(copyBytes)) {
  throw new Error('adaptive_learning launch copy did not match adaptive_learning.html after sync');
}
console.log('Synced public/gamehub/adaptive_learning from public/gamehub/adaptive_learning.html');
