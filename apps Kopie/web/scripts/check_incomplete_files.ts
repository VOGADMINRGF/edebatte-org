// scripts/check_incomplete_files.ts
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const exts = new Set(['.ts','.tsx','.js','.jsx']);
const offenders:string[] = [];

function walk(dir:string){
  for(const e of fs.readdirSync(dir, { withFileTypes:true })){
    const p = path.join(dir, e.name);
    if(e.isDirectory()){
      if(['node_modules','.next','.git','dist'].includes(e.name)) continue;
      walk(p);
    } else {
      const ext = path.extname(e.name);
      if(!exts.has(ext)) continue;
      const s = fs.readFileSync(p, 'utf8');
      if (s.includes('...') || s.includes('\uFFFD')) offenders.push(path.relative(ROOT,p));
    }
  }
}

walk(ROOT);
if (offenders.length) {
  console.error('❌ Incomplete files detected (contains ellipses or replacement chars):');
  for(const f of offenders) console.error(' -', f);
  process.exit(1);
} else {
  console.log('✅ No incomplete files found.');
}
