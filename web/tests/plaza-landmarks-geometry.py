"""Static acceptance: retained geometry, manifold solids, GLB/contact identity."""
import json,struct,hashlib,math
from pathlib import Path
from collections import Counter
ROOT=Path(__file__).resolve().parents[2];C=ROOT/'artifacts/station-detail/plaza-landmarks/candidate'
base=json.loads((ROOT/'runtime/station-layout.json').read_text());candidate=json.loads((C/'station-layout.json').read_text());proposal=json.loads((C/'collision-proposal.json').read_text());added=proposal['panels']
assert hashlib.sha256((ROOT/'runtime/station-layout.json').read_bytes()).hexdigest()==proposal['baseLayoutSha256']
for k,v in base.items():
    if k=='panels':assert candidate[k]==v+added
    elif k=='authoredMaterials':assert candidate[k]==v+proposal[k]
    else:assert candidate[k]==v,k
ids=[p['id']for p in added];assert len(set(ids))==len(ids) and all(i.startswith('k028-')for i in ids)
assert not set(ids)&{p['id']for p in base['panels']}
for a in json.loads((C/'anchors.json').read_text())['landmarks']:
    assert abs(a['baseGap'])<1e-5 and len(a['supportSamples'])==187
# Every substantial mesh is closed. Signed volume catches inward-facing bases.
volumes={}
for p in added:
    edges=Counter();volume=0;v=p['vertices'];t=p['triangles']
    for j in range(0,len(t),3):
        tri=t[j:j+3]
        for u,w in zip(tri,tri[1:]+tri[:1]):edges[tuple(sorted((u,w)))]+=1
        a,b,c=[[v[i][k]for k in 'xyz']for i in tri];volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6
    assert all(n==2 for n in edges.values()),('Non-manifold solid',p['id'],Counter(edges.values()))
    assert volume>1e-7,('Inward solid',p['id'],volume)
    volumes[p['id']]=volume
# Decode exact exported GLB vertex/index values; all transforms must be identity.
raw=(C/'plaza-landmarks.glb').read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);binary=raw[28+n:]
def accessor(i):
    a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];count={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];fmt={5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']];size=struct.calcsize(fmt)*count;start=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',size)
    return [struct.unpack_from('<'+fmt*count,binary,start+j*stride)for j in range(a['count'])]
def key(tri):return tuple(sorted(tuple(p)for p in tri))
matched=0
for node in g['nodes']:
    if 'mesh'not in node:continue
    assert not any(k in node for k in ['matrix','translation','rotation','scale']),node
    p=next(p for p in added if p['id']==node['name']);expected=Counter(key([(p['vertices'][i]['x'],p['vertices'][i]['y'],-p['vertices'][i]['z'])for i in p['triangles'][j:j+3]])for j in range(0,len(p['triangles']),3));actual=Counter()
    for prim in g['meshes'][node['mesh']]['primitives']:
        v=accessor(prim['attributes']['POSITION']);idx=[x[0]for x in accessor(prim['indices'])]
        actual.update(key([v[i]for i in idx[j:j+3]])for j in range(0,len(idx),3))
    assert actual==expected,('GLB/contact mismatch',p['id'],sum((actual-expected).values()),sum((expected-actual).values()));matched+=sum(actual.values())
receipt={'status':'pass','unchangedBase':True,'manifoldPositiveVolumes':volumes,'exactMatchedGlbCollisionTriangles':matched,'layers':sorted(set(p['layer']for p in added))}
(C/'geometry-check.json').write_text(json.dumps(receipt,indent=2)+'\n');print('PASS',matched,'exact visible/contact triangles; all retained geometry unchanged')
# Assembled browser retains original buffers and all existing indexed definitions.
if (C/'browser/atrium.glb').exists():
    def glb(path):
        raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];return json.loads(raw[20:20+n]),raw[28+n:]
    old,ob=glb(ROOT/'web/public/assets/atrium.glb');new,nb=glb(C/'browser/atrium.glb')
    assert nb[:len(ob)]==ob,'Retained binary changed'
    for k in ['nodes','meshes','materials','textures','images','samplers','accessors','bufferViews']:assert new[k][:len(old[k])]==old[k],k
    sha=hashlib.sha256((C/'station-layout.json').read_bytes()).hexdigest()
    assert new['asset']['extras']['candidateLayoutSha256']==sha
    assert json.loads((C/'browser/station.json').read_text())['layoutSha256']==sha
    assert json.loads((C/'browser/atrium-detail.json').read_text())['sourceLayoutSha256']==sha
    assert (C/'browser/atrium-detail.glb').read_bytes()==(ROOT/'web/public/assets/atrium-detail.glb').read_bytes()
    receipt['assembledBaseBinaryUnchanged']=True;receipt['candidateLayoutSha256']=sha
    (C/'geometry-check.json').write_text(json.dumps(receipt,indent=2)+'\n');print('PASS assembled base binary, indexed definitions, hardware and layout identities')
