#!/usr/bin/env python3
"""Build the game from src/ into one HTML file.
usage: python3 build.py [srcdir] [out_embed.html] [out_standalone.html]
Defaults: src/ -> dist/stormline.html (no <html>/<head>, for claude.ai artifacts) and dist/stormline-royale.html (standalone page)."""
import sys,os,glob,re,subprocess
src=sys.argv[1] if len(sys.argv)>1 else os.path.join(os.path.dirname(os.path.abspath(__file__)),'src')
root=os.path.dirname(os.path.abspath(__file__))
out=sys.argv[2] if len(sys.argv)>2 else os.path.join(root,'dist','stormline.html')
out2=sys.argv[3] if len(sys.argv)>3 else os.path.join(root,'dist','stormline-royale.html')
os.makedirs(os.path.dirname(out),exist_ok=True)
rd=lambda p:open(os.path.join(src,p)).read()
js='\n'.join(open(f).read() for f in sorted(glob.glob(os.path.join(src,'js','*.js'))))
art=rd('head.html')+'\n<style>\n'+rd('style.css')+'\n</style>\n'+rd('body.html')+'\n<script type="module">\n'+js+'\n</script>\n'
open(out,'w').write(art)
if out2:
    head='<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n'
    open(out2,'w').write(head+rd('head.html')+'\n<style>\n'+rd('style.css')+'\n</style>\n</head>\n<body>\n'+rd('body.html')+'\n<script type="module">\n'+js+'\n</script>\n</body>\n</html>\n')
tmp='/tmp/_chk_%d.mjs'%os.getpid();open(tmp,'w').write(js)
r=subprocess.run(['node','--check',tmp],capture_output=True,text=True)
print('BUILD OK' if r.returncode==0 else 'SYNTAX ERROR\n'+r.stderr[-2000:])
sys.exit(r.returncode)
