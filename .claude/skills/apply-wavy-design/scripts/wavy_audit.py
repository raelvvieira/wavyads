#!/usr/bin/env python3
"""Heuristic static audit for WAVY migrations; complement with visual/manual QA."""
import argparse,json,re
from pathlib import Path
EXTS={'.css','.scss','.sass','.less','.html','.htm','.jsx','.tsx','.js','.ts','.vue','.svelte'}
SKIP={'node_modules','.git','dist','build','.next','coverage','vendor'}
RULES={'pure_black':re.compile(r'(?i)(?:#000(?:000)?\b|rgb\(\s*0\s*,\s*0\s*,\s*0\s*\))'),'legacy_beige':re.compile(r'(?i)#(?:F8F6F1|FAF7F5)\b'),'color':re.compile(r'(?i)#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)'),'transition_all':re.compile(r'(?i)transition\s*:\s*all\b|\btransition-all\b'),'outline_none':re.compile(r'(?i)outline\s*:\s*(?:none|0)\b'),'reduced':re.compile(r'(?i)prefers-reduced-motion'),'tokens':re.compile(r'--wavy-|wavy-tokens')}
def source_files(root):
 for p in root.rglob('*'):
  if p.is_file() and p.suffix.lower() in EXTS and not any(x in SKIP for x in p.parts): yield p
def main():
 ap=argparse.ArgumentParser();ap.add_argument('path',type=Path);ap.add_argument('--json',action='store_true');a=ap.parse_args();root=a.path.resolve()
 if not root.exists(): ap.error(f'Path does not exist: {root}')
 out=[];all_text='';count=0
 for p in source_files(root):
  text=p.read_text(encoding='utf-8',errors='ignore');all_text+='\n'+text;count+=1;rel=str(p.relative_to(root))
  for key in ('pure_black','legacy_beige','transition_all','outline_none'):
   for m in RULES[key].finditer(text): out.append({'rule':key,'severity':'medium' if key in ('pure_black','outline_none') else 'low','file':rel,'line':text.count('\n',0,m.start())+1})
  colors=RULES['color'].findall(text)
  if len(colors)>=12 and not RULES['tokens'].search(text): out.append({'rule':'many_hardcoded_colors','severity':'medium','file':rel,'line':1,'count':len(colors)})
 checks={'has_wavy_tokens':bool(RULES['tokens'].search(all_text)),'has_reduced_motion':bool(RULES['reduced'].search(all_text))}
 if not checks['has_wavy_tokens']: out.append({'rule':'missing_wavy_semantic_tokens','severity':'high','file':None,'line':None})
 if not checks['has_reduced_motion']: out.append({'rule':'missing_reduced_motion','severity':'high','file':None,'line':None})
 result={'root':str(root),'files_scanned':count,'checks':checks,'findings':out,'note':'Static heuristics only; verify rendering, contrast, keyboard, responsiveness, and workflow manually.'}
 if a.json: print(json.dumps(result,indent=2,ensure_ascii=False))
 else:
  print(f'WAVY audit: {count} files, {len(out)} findings')
  for x in out: print(f"[{x['severity'].upper()}] {x['rule']} — {x.get('file') or 'global'}:{x.get('line') or '-'}")
  print(result['note'])
 return 1 if any(x['severity']=='high' for x in out) else 0
if __name__=='__main__': raise SystemExit(main())
