import sys, time, json, os
from playwright.sync_api import sync_playwright
import os
HTML=open(os.environ.get('HTML',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','dist','stormline.html'))).read()
PAGE='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'+HTML+'</body></html>'
HERE=os.path.dirname(os.path.abspath(__file__))
TRY=open(os.path.join(HERE,'mock_trystero.mjs')).read() if os.environ.get('MOCK') else open(os.path.join(HERE,'trystero.mjs')).read()
def route(r):
    u=r.request.url
    if u.startswith('http://game.local/'): return r.fulfill(body=PAGE,content_type='text/html')
    if 'three@0.170.0' in u:
        rel=u.split('three@0.170.0/',1)[1].split('?')[0]
        fp=os.path.join(HERE,'node_modules','three',rel)
        if os.path.exists(fp): return r.fulfill(body=open(fp,'rb').read(),content_type='application/javascript',headers={'access-control-allow-origin':'*'})
        return r.fulfill(status=404,body='nf')
    if 'trystero' in u: return r.fulfill(body=TRY,content_type='application/javascript',headers={'access-control-allow-origin':'*'})
    if 'fonts.g' in u: return r.abort()
    import glob
    for d in os.environ.get('ASSET_DIRS','').split(':'):
        if d and u.startswith('http://game.local/'):
            fp=os.path.join(d,u[len('http://game.local/'):])
            if os.path.isfile(fp): return r.fulfill(body=open(fp,'rb').read())
    return r.abort()
def page(b, w=1400, h=860):
    p=b.new_page(viewport={'width':w,'height':h})
    p.route('**/*',route)
    logs=[]
    p.on('console',lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in('error','warning') else None)
    p.on('pageerror',lambda e: logs.append(f'[pageerror] {e}'))
    p.goto('http://game.local/')
    return p,logs
if __name__=='__main__':
    script=sys.argv[1]
    with sync_playwright() as pw:
        b=pw.chromium.launch(args=['--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        exec(open(script).read())
        b.close()
