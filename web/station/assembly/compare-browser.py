"""Prove unchanged baseline browser geometry survives complete station re-export.
Includes all Japanese sign meshes; only nine exact old shop material groups retire.
"""
import argparse, hashlib, json, struct
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('baseline',type=Path);p.add_argument('candidate',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
retired={'Warm ivory tile','Warm interior panels','Brushed metal frames','Shop window glazing','Green sign band','Orange sign band','Red sign band','Receiving mat adaptation','Ivory signage'}
untextured_uv_roundoff={'East canopy | charcoal soffit','East canopy | dark coping','East canopy | pale mineral fascia'}
def read(path):
    raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n]);binary=raw[28+n:];return doc,binary
def meshes(path):
    doc,binary=read(path);result={};uvs={}
    def data(index):
        acc=doc['accessors'][index];view=doc['bufferViews'][acc['bufferView']]
        width={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}[acc['componentType']]*{'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[acc['type']]
        offset=view.get('byteOffset',0)+acc.get('byteOffset',0);stride=view.get('byteStride',width)
        payload=binary[offset:offset+acc['count']*width] if stride==width else b''.join(binary[offset+i*stride:offset+i*stride+width]for i in range(acc['count']))
        return {'count':acc['count'],'type':acc['type'],'componentType':acc['componentType'],'sha256':hashlib.sha256(payload).hexdigest()}
    for node in doc['nodes']:
        if 'mesh' not in node:continue
        mesh=doc['meshes'][node['mesh']];label=node.get('extras',{}).get('sourceMaterial')
        if label is None:label=mesh['name'].split(' @ ')[0]
        result[node['name']]={'label':label,'transform':{k:node[k]for k in ['matrix','translation','rotation','scale']if k in node},
            'geometry':[{k:data(v)for k,v in {'indices':pr['indices'],**pr['attributes']}.items()}for pr in mesh['primitives']]}
        if label in untextured_uv_roundoff:
            assert len(mesh['primitives'])==1
            primitive=mesh['primitives'][0];mat=doc['materials'][primitive['material']]
            assert not any(k.endswith('Texture') for k in mat.get('pbrMetallicRoughness',{})) and not any(k.endswith('Texture') for k in mat)
            acc=doc['accessors'][primitive['attributes']['TEXCOORD_0']];view=doc['bufferViews'][acc['bufferView']]
            assert acc['componentType']==5126 and 'byteStride'not in view
            offset=view.get('byteOffset',0)+acc.get('byteOffset',0)
            uvs[node['name']]=struct.unpack_from('<'+'f'*(acc['count']*2),binary,offset)
    return result,uvs
(old,old_uv),(new,new_uv)=meshes(a.baseline),meshes(a.candidate);checked=[];mismatches=[];roundoff=[]
for name,record in old.items():
    if record['label'] in retired:continue
    if record != new.get(name):
        if name in old_uv and name in new_uv:
            x,y=old_uv[name],new_uv[name];error=max(abs(i-j)for i,j in zip(x,y)) if len(x)==len(y) else float('inf')
            before=json.loads(json.dumps(record));after=json.loads(json.dumps(new[name]))
            for r in [before,after]:r['geometry'][0].pop('TEXCOORD_0')
            if before==after and error<=1e-7:
                roundoff.append({'name':name,'maxUvError':error,'materialHasTextures':False});checked.append(name);continue
        mismatches.append(name)
    else:checked.append(name)
report={'status':'pass'if not mismatches else'fail','unchangedGeometryBatches':len(checked),'allAttributeByteIdenticalBatches':len(checked)-len(roundoff),'checkedNames':checked,'mismatches':mismatches,'untexturedUvRoundoff':roundoff,'retiredShopMaterialLabels':sorted(retired),
        'claim':'All non-shop original position, normal, index and node-transform bytes match assets-v2, including existing Japanese label geometry. UV rounding is separately bounded for three untextured canopy materials.'}
a.output.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:report[k]for k in ['status','unchangedGeometryBatches','allAttributeByteIdenticalBatches','untexturedUvRoundoff','mismatches']}));assert not mismatches
