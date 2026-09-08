"""Assemble candidate browser bytes without re-exporting retained station meshes.
Only simple static, single-buffer GLBs are accepted. Base binary/accessors remain
byte-for-byte intact; every appended reference is remapped and checked by tests.
"""
from pathlib import Path
import json,struct,copy,hashlib,shutil
ROOT=Path(__file__).resolve().parents[3];C=ROOT/'artifacts/station-detail/plaza-landmarks/candidate';OUT=C/'browser';OUT.mkdir(exist_ok=True)
def read(path):
    raw=path.read_bytes();magic,version,length=struct.unpack_from('<III',raw);assert magic==0x46546c67 and version==2 and length==len(raw)
    n,t=struct.unpack_from('<II',raw,12);assert t==0x4e4f534a;doc=json.loads(raw[20:20+n]);b,t=struct.unpack_from('<II',raw,20+n);assert t==0x004e4942;data=raw[28+n:28+n+b]
    assert len(doc['buffers'])==1 and 'uri' not in doc['buffers'][0]
    assert not any(k in doc for k in ['skins','animations','extensionsRequired','extensionsUsed','cameras'])
    return doc,data
base,binary=read(ROOT/'web/public/assets/atrium.glb');add,extra=read(C/'plaza-landmarks.glb')
keys=['nodes','meshes','materials','textures','images','samplers','accessors','bufferViews'];offset={k:len(base.get(k,[]))for k in keys}
for node in add['nodes']:
    assert not any(k in node for k in ['skin','camera','extensions'])
    if 'mesh' in node:node['mesh']+=offset['meshes']
    if 'children'in node:node['children']=[n+offset['nodes']for n in node['children']]
for mesh in add['meshes']:
    for primitive in mesh['primitives']:
        assert 'targets'not in primitive and 'extensions'not in primitive
        primitive['attributes']={k:v+offset['accessors']for k,v in primitive['attributes'].items()}
        if 'indices'in primitive:primitive['indices']+=offset['accessors']
        if 'material'in primitive:primitive['material']+=offset['materials']
for accessor in add['accessors']:
    assert 'sparse'not in accessor
    accessor['bufferView']+=offset['bufferViews']
for view in add['bufferViews']:
    assert view['buffer']==0;view['byteOffset']=view.get('byteOffset',0)+len(binary)
for image in add.get('images',[]):image['bufferView']+=offset['bufferViews']
for tex in add.get('textures',[]):
    tex['source']+=offset['images']
    if 'sampler'in tex:tex['sampler']+=offset['samplers']
def texture_refs(obj):
    for k,v in obj.items():
        if isinstance(v,dict):
            if k.endswith('Texture') and 'index'in v:v['index']+=offset['textures']
            else:texture_refs(v)
for mat in add.get('materials',[]):texture_refs(mat)
for k in keys:base.setdefault(k,[]).extend(add.get(k,[]))
base['scenes'][base.get('scene',0)]['nodes'].extend(n+offset['nodes']for n in add['scenes'][add.get('scene',0)]['nodes'])
base['buffers'][0]['byteLength']=len(binary)+len(extra)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
base['asset']['extras']={'k028BaseGlbSha256':sha(ROOT/'web/public/assets/atrium.glb'),'k028LayerGlbSha256':sha(C/'plaza-landmarks.glb'),'candidateLayoutSha256':sha(C/'station-layout.json')}
j=json.dumps(base,separators=(',',':')).encode();j+=b' '*((-len(j))%4);data=binary+extra
(OUT/'atrium.glb').write_bytes(struct.pack('<III',0x46546c67,2,28+len(j)+len(data))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(data),0x004e4942)+data)
station=json.loads((ROOT/'web/public/assets/station.json').read_text());station['layoutSha256']=sha(C/'station-layout.json');station['authoredMaterials'].extend(json.loads((C/'collision-proposal.json').read_text())['authoredMaterials']);(OUT/'station.json').write_text(json.dumps(station,separators=(',',':')))
# Hardware exclusively references retained surfaces. Preserve bytes and record the
# additive-layout derivation rather than pretending this was a hardware rebuild.
shutil.copyfile(ROOT/'web/public/assets/atrium-detail.glb',OUT/'atrium-detail.glb')
detail=json.loads((ROOT/'web/public/assets/atrium-detail.json').read_text());old=detail['sourceLayoutSha256'];detail['sourceLayoutSha256']=station['layoutSha256'];detail['k028RetainedHardware']={'sourceLayoutSha256':old,'reason':'All original collision entries and transforms are unchanged; landmark layer is additive.'};(OUT/'atrium-detail.json').write_text(json.dumps(detail,separators=(',',':')))
receipt={'layoutSha256':station['layoutSha256'],'baseGlbSha256':sha(ROOT/'web/public/assets/atrium.glb'),'layerGlbSha256':sha(C/'plaza-landmarks.glb'),'assembledGlbSha256':sha(OUT/'atrium.glb'),'baseBinaryBytes':len(binary),'addedBinaryBytes':len(extra),'baseMeshes':offset['meshes'],'addedMeshes':len(add['meshes']),'hardwareUnchanged':sha(OUT/'atrium-detail.glb')==sha(ROOT/'web/public/assets/atrium-detail.glb')}
(OUT/'assembly.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
