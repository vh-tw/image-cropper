"""Fetch pinned browser libraries from the official npm registry."""
from pathlib import Path
import urllib.request,tarfile,io,hashlib,json
root=Path(__file__).resolve().parents[1]/'vendor'
packages={
 'jszip':('3.10.1',{'package/dist/jszip.min.js':'jszip.min.js','package/LICENSE.markdown':'JSZip-LICENSE.txt'}),
 'utif':('3.1.0',{'package/UTIF.js':'UTIF.js','package/LICENSE':'UTIF-LICENSE.txt'}),
 'pako':('1.0.11',{'package/dist/pako.min.js':'pako.min.js','package/LICENSE':'pako-LICENSE.txt'})
}
manifest={}
for name,(version,paths) in packages.items():
    url=f'https://registry.npmjs.org/{name}/-/{name}-{version}.tgz'
    data=urllib.request.urlopen(url).read()
    with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as tar:
        for src,dst in paths.items():
            content=tar.extractfile(src).read();(root/dst).write_bytes(content)
            manifest[dst]={'package':name,'version':version,'sha256':hashlib.sha256(content).hexdigest(),'source':url}
    print(name,version,'ready')
(root/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
