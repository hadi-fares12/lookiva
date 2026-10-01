#!/usr/bin/env python3
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
errs=[]
for app in ['customer-mobile','business-mobile']:
  for p in (ROOT/'apps'/app/'lib').rglob('*.dart'):
    s=p.read_text(errors='ignore')
    stack=[]; i=0; quote=None; triple=False; line=1
    while i<len(s):
      ch=s[i]
      if ch=='\n': line+=1
      if quote:
        if triple:
          if s.startswith(quote*3,i): quote=None; triple=False; i+=3; continue
          if ch=='\\': i+=2; continue
          i+=1; continue
        else:
          if ch=='\\': i+=2; continue
          if ch==quote: quote=None
          i+=1; continue
      if s.startswith('//',i):
        j=s.find('\n',i); i=len(s) if j<0 else j; continue
      if s.startswith('/*',i):
        j=s.find('*/',i+2)
        if j<0: errs.append(f'{p}: unclosed block comment'); break
        line += s[i:j+2].count('\n'); i=j+2; continue
      if ch in "'\"":
        if s.startswith(ch*3,i): quote=ch; triple=True; i+=3; continue
        quote=ch; i+=1; continue
      if ch in '([{': stack.append((ch,line))
      elif ch in ')]}':
        match={')':'(',']':'[','}':'{'}[ch]
        if not stack or stack[-1][0]!=match: errs.append(f'{p}:{line}: unmatched {ch}'); break
        stack.pop()
      i+=1
    if quote: errs.append(f'{p}: unclosed string literal')
    if stack: errs.append(f'{p}:{stack[-1][1]}: unclosed {stack[-1][0]}')
print({'dartFiles':sum(1 for app in ['customer-mobile','business-mobile'] for _ in (ROOT/'apps'/app/'lib').rglob('*.dart')),'errors':errs})
if errs: sys.exit(1)
