"""Matched raised visual/collision meshes on the current tactile footprints.
5 mm profiles follow the numerical MLIT/RTRI references in TACTILE-CONTACT.md.
No new physical response: each patch inherits its supporting floor material.
"""
import bpy,math,json
from mathutils import Vector
from mathutils.bvhtree import BVHTree

def build(layout,mesh,materials,metadata):
    material=bpy.data.materials.new('Fleet tactile yellow');material.diffuse_color=(.62,.43,.08,1);material.use_nodes=True
    bs=material.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.62,.43,.08,1);bs.inputs['Roughness'].default_value=.73
    materials[material.name]=material
    layout['authoredMaterials'].append({'id':'fleet-tactile-yellow','label':material.name,'physical':'granite','linearColor':dict(zip('rgba',(.62,.43,.08,1))),'metallic':0,'roughness':.73,'alpha':1,'normalScale':1})
    floors=[]
    roles={'floor','plaza','landing','building-floor','bridge-floor','ramp','skyway'}
    for p in layout['panels']:
        if p['collision'] and p.get('role')in roles:
            v=[Vector(tuple(v[k]for k in 'xyz'))for v in p['vertices']]
            floors.append((p['id'],p['material'],BVHTree.FromPolygons(v,[p['triangles'][i:i+3]for i in range(0,len(p['triangles']),3)],all_triangles=True)))
    def support(position):
        hits=[]
        for name,physical,tree in floors:
            hit,normal,index,distance=tree.ray_cast(Vector(position)+Vector((0,.08,0)),Vector((0,-1,0)),.16)
            if hit is not None and normal.y>.99:hits.append((distance,name,physical,hit.y))
        # Box floors retained as canonical axis-aligned slabs at the warning sites.
        for p in layout['boxes']:
            if not p['collision'] or p.get('role')not in roles or p.get('yaw',0):continue
            c=p['center'];s=p['size'];top=c['y']+s['y']/2
            if abs(top-position[1])<.08 and abs(position[0]-c['x'])<s['x']/2 and abs(position[2]-c['z'])<s['z']/2:hits.append((position[1]+.08-top,p['id'],p['material'],top))
        if not hits:raise ValueError('Tactile footprint lacks supporting floor at '+str(position))
        return min(hits)
    meta=json.loads(metadata.read_text());patches=[]
    for p in meta['landings']:
        q=p['position'];patches.append({'id':'tactile-'+p['id'],'position':(q['x'],q['y']-.003,q['z']),'u':(p['uphill']['x'],p['uphill']['z']),'width':p['width'],'length':.3,'pattern':'dots'})
    patches.extend([
        {'id':'tactile-concourse-spine','position':(0,0,-5),'u':(0,1),'width':.3,'length':38,'pattern':'bars'},
        {'id':'tactile-concourse-branch','position':(8.5,0,4),'u':(1,0),'width':.3,'length':17,'pattern':'bars'},
        {'id':'tactile-concourse-junction','position':(0,0,4),'u':(0,1),'width':.6,'length':.6,'pattern':'dots'}])
    summary=[]
    for p in patches:
        _,floor,physical,y=support(p['position']);origin=Vector((p['position'][0],y,p['position'][2]));u=Vector((p['u'][0],0,p['u'][1]));side=Vector((u.z,0,-u.x));w=p['width'];length=p['length']
        world=lambda v:origin+side*v[0]+Vector((0,v[1],0))+u*v[2]
        def export(suffix,vertices,faces,collision):
            vertices=[world(v)for v in vertices]
            o=mesh(p['id']+suffix,[(v.x,v.z,v.y)for v in vertices],[tuple(reversed(f))for f in faces],material,physical,collision)
            o['kyoto_role']='tactile '+p['pattern'];return o
        export('-base',[(-w/2,.0001,-length/2),(-w/2,.0001,length/2),(w/2,.0001,length/2),(w/2,.0001,-length/2)],[(0,1,2,3)],False)
        vertices=[];faces=[];features=0
        def add(v,f):
            nonlocal features
            offset=len(vertices);vertices.extend(v);faces.extend(tuple(offset+i for i in t)for t in f);features+=1
        if p['pattern']=='dots':
            nx=max(1,int(w/.06));nz=max(1,int(length/.06));segments=16
            for ix in range(nx):
                for iz in range(nz):
                    x=(ix-(nx-1)/2)*.06;z=(iz-(nz-1)/2)*.06
                    v=[(x+r*math.cos(j*math.tau/segments),h,z+r*math.sin(j*math.tau/segments))for r,h in [(.011,0),(.006,.005)]for j in range(segments)]
                    f=[tuple(range(segments)),tuple(reversed(range(segments,segments*2)))]
                    f.extend((j,j+segments,(j+1)%segments+segments,(j+1)%segments)for j in range(segments));add(v,f)
        else:
            for tile in range(math.ceil(length/.3)):
                z=-length/2+(tile+.5)*.3
                for bar in range(4):
                    x=(bar-1.5)*.075;z0=max(-length/2,z-.145);z1=min(length/2,z+.145)
                    centre=world((x,0,z))
                    if abs(centre.x)<.31 and abs(centre.z-4)<.45:continue
                    if z1-z0<.02:continue
                    v=[(x+a,0,b)for a,b in [(-.0135,z0),(-.0135,z1),(.0135,z1),(.0135,z0)]]
                    v.extend((x+a,.005,b)for a,b in [(-.0085,z0+.005),(-.0085,z1-.005),(.0085,z1-.005),(.0085,z0+.005)])
                    f=[(3,2,1,0),(4,5,6,7)]+[(j,(j+1)%4,(j+1)%4+4,j+4)for j in range(4)];add(v,f)
        export('-raised',vertices,faces,True)
        summary.append({**p,'position':list(origin),'support':floor,'physical':physical,'features':features,'height':.005})
    return summary
