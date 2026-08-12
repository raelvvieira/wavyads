#!/usr/bin/env python3
"""Heuristic static audit for WAVY migrations; complement with visual/manual QA."""
import argparse,json,re
from pathlib import Path
EXTS={'.css','.scss','.sass','.less','.html','.htm','.jsx','.tsx','.js','.ts','.vue','.svelte'}
SKIP={'node_modules','.git','dist','build','.next','coverage','vendor'}
RULES={'pure_black':re.compile(r'(?i)(?:#000(?:000)?\b|rgb\(\s*0\s*,\s*0\s*,\s*0\s*\))'),'legacy_beige':re.compile(r'(?i)#(?:F8F6F1|FAF7F5)\b'),'color':re.compile(r'(?i)#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)'),'transition_all':re.compile(r'(?i)transition\s*:\s*all\b|\btransition-all\b'),'outline_none':re.compile(r'(?i)outline\s*:\s*(?:none|0)\b'),'reduced':re.compile(r'(?i)prefers-reduced-motion'),'reduced_transparency':re.compile(r'(?i)prefers-reduced-transparency'),'more_contrast':re.compile(r'(?i)prefers-contrast\s*:\s*more'),'tokens':re.compile(r'--wavy-|wavy-tokens'),'type_craft':re.compile(r'(?i)font-optical-sizing|--wavy-tracking|letter-spacing'),'glass':re.compile(r'(?i)backdrop-filter|backdrop-blur'),'nav_island':re.compile(r'(?i)wavy-nav-island|navigation.?island|floating.?nav'),'nav_expand':re.compile(r'(?i)aria-expanded|data-expanded|nav-expanded'),'edge_sidebar':re.compile(r'(?is)(?:sidebar|side-nav)[^{]{0,80}\{[^}]{0,300}(?:left\s*:\s*0|inset\s*:\s*0)[^}]{0,300}(?:height\s*:\s*100vh|top\s*:\s*0)')}
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
 checks={'has_wavy_tokens':bool(RULES['tokens'].search(all_text)),'has_reduced_motion':bool(RULES['reduced'].search(all_text)),'has_reduced_transparency':bool(RULES['reduced_transparency'].search(all_text)),'has_increased_contrast':bool(RULES['more_contrast'].search(all_text)),'has_type_craft':bool(RULES['type_craft'].search(all_text)),'has_glass_material':bool(RULES['glass'].search(all_text)),'has_navigation_island':bool(RULES['nav_island'].search(all_text)),'has_expandable_navigation':bool(RULES['nav_expand'].search(all_text)),'has_edge_bound_sidebar':bool(RULES['edge_sidebar'].search(all_text))}
 if not checks['has_wavy_tokens']: out.append({'rule':'missing_wavy_semantic_tokens','severity':'high','file':None,'line':None})
 if not checks['has_reduced_motion']: out.append({'rule':'missing_reduced_motion','severity':'high','file':None,'line':None})
 if not checks['has_reduced_transparency']: out.append({'rule':'missing_reduced_transparency','severity':'medium','file':None,'line':None})
 if not checks['has_increased_contrast']: out.append({'rule':'missing_increased_contrast_preference','severity':'medium','file':None,'line':None})
 if not checks['has_type_craft']: out.append({'rule':'missing_size_aware_typography','severity':'medium','file':None,'line':None})
 if checks['has_edge_bound_sidebar']: out.append({'rule':'legacy_edge_bound_sidebar','severity':'high','file':None,'line':None})
 if not checks['has_glass_material']: out.append({'rule':'missing_glass_material','severity':'medium','file':None,'line':None})
 if not checks['has_navigation_island']: out.append({'rule':'missing_floating_navigation_island','severity':'high','file':None,'line':None})
 if not checks['has_expandable_navigation']: out.append({'rule':'missing_click_expandable_navigation','severity':'high','file':None,'line':None})
 result={'root':str(root),'files_scanned':count,'checks':checks,'findings':out,'note':'Static heuristics only; verify rendering, contrast, keyboard, responsiveness, and workflow manually.'}
 if a.json: print(json.dumps(result,indent=2,ensure_ascii=False))
 else:
  print(f'WAVY audit: {count} files, {len(out)} findings')
  for x in out: print(f"[{x['severity'].upper()}] {x['rule']} — {x.get('file') or 'global'}:{x.get('line') or '-'}")
  print(result['note'])
 return 1 if any(x['severity']=='high' for x in out) else 0
if __name__=='__main__': raise SystemExit(main())
