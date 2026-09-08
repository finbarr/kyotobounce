"""Fit the station-owned garden handoff into a structural candidate.
Consumes its .blend and metadata; never copies the decorative builder or edits
canonical source. All contact meshes are exported from the fitted visible mesh.
"""
import bpy,json,math,re
from pathlib import Path
from mathutils import Vector

def build(layout,mesh,box,materials,handoff):
    metadata=json.loads((handoff/'garden-candidate.json').read_text())
    top=metadata['footprint']['floorY'];base=metadata['access']['lowerY']
    # Actual straight facade segments in this western x range. Keep all garden
    # geometry inside the atrium, avoiding floor10/11 and facade intersections.
    north=next(p for p in layout['panels']if p['id']=='west-north-floor-10')
    south=next(p for p in layout['panels']if p['id']=='west-south-floor-10')
    def line(panel,northern):
        v=sorted({(v['x'],v['z'])for v in panel['vertices']if ((v['z']<29)if northern else(v['z']>-55))})
        a,b=v[0],v[1];m=(b[1]-a[1])/(b[0]-a[0]);return m,a[1]-m*a[0]
    nm,nb=line(north,True);sm,sb=line(south,False)
    south_ends=[max(-35,sm*x+sb+.35)for x in [-168,-142]]
    north_ends=[min(-9,nm*x+nb-.35)for x in [-168,-142]]
    def fit(v):
        x,z,y=v
        # Weld source float32 box seams before fitting; independent boxes had
        # 15-micrometre gaps at the shared deck/arrival boundary.
        x=next((q for q in [-168,-157.2,-154.8,-142]if abs(x-q)<.00003),x)
        z=next((q for q in [-35,-9]+[-34+i*.31 for i in range(29)]if abs(z-q)<.00003),z)
        # Keep the outer x envelope, but widen the central slot/treads by20cm.
        if x< -157.2:x=-168+(x+168)*10.7/10.8
        elif x> -154.8:x=-154.7+(x+154.8)*12.7/12.8
        else:x=-156+(x+156)*2.6/2.4
        t=(x+168)/26;low=south_ends[0]*(1-t)+south_ends[1]*t;high=north_ends[0]*(1-t)+north_ends[1]*t
        if z< -34:z=low+(z+35)*(-31-low)
        elif z> -25.32:z=-22.32+(z+25.32)*(high+22.32)/16.32
        else:z+=3
        return Vector((x,z,y))
    with bpy.data.libraries.load(str(handoff/'RoofGardenCandidate.blend'),link=False) as (src,dst):dst.objects=src.objects
    imported=dst.objects;summary=[]
    collision_groups={p['meshGroup']for p in metadata['colliderProposals']}|set(metadata['additionalMeshColliderGroups'])|{'Bamboo culms','Bamboo branches'}
    for obj in imported:
        if obj is None or obj.type!='MESH':continue
        name=obj.name;mat=obj.data.materials[0]
        if mat.name not in materials:
            materials[mat.name]=mat;bs=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
            rgba=list(bs.inputs['Base Color'].default_value)if bs else list(mat.diffuse_color)
            alpha=float(bs.inputs['Alpha'].default_value)if bs else rgba[3]
            layout['authoredMaterials'].append({'id':'garden-'+re.sub('[^a-z0-9]+','-',mat.name.lower()).strip('-'),'label':mat.name,'physical':'stone','linearColor':dict(zip('rgba',rgba)),'metallic':float(bs.inputs['Metallic'].default_value)if bs else 0,'roughness':float(bs.inputs['Roughness'].default_value)if bs else .7,'alpha':alpha,'normalScale':1})
        physical='glass'if 'glass'in name.lower() else 'steel'if any(s in name.lower()for s in ['rail','post','lamp','legs'])else'wood'if 'Bench timber'in name or 'Bamboo culm'in name or 'Bamboo branch'in name else'stone'
        collision=name in collision_groups or name.startswith('Garden lamp bracket')
        v=[fit(obj.matrix_world@p.co)for p in obj.data.vertices]
        # Straight fitted boundaries keep long rail/glass members aligned
        # with intermediate posts and the deck edge.
        o=mesh('k008-'+re.sub('[^a-z0-9]+','-',name.lower()).strip('-'),v,[tuple(p.vertices)for p in obj.data.polygons],mat,physical,collision)
        o['kyoto_role']='garden-floor'if 'deck'in name else'garden-stair'if 'tread'in name else'garden-guard'if any(s in name.lower()for s in ['rail','post','glass'])else'garden-detail'
        summary.append({'id':o.name,'sourceObject':name,'collision':collision})
        bpy.data.objects.remove(obj,do_unlink=True)
    # A supported 2.6m approach apron reaches the true last-flight contour.
    # It is not a floor inferred from the landing's bounding box.
    paving=materials['Garden pale paving'];steel=materials['Garden steel'];glass=materials['Garden guard glazing']
    def slab(name,bounds,mat=paving,physical='stone'):
        o=box('k008-'+name,bounds,mat,physical);o['kyoto_role']='garden-access';return o
    # Widen only the new turning area, using the actual curved landing edge
    # at each section; retain the existing flight noses/east boundary.
    landing=next(p for p in layout['panels']if p['id']=='north-circulation-landing-14')
    from mathutils.bvhtree import BVHTree
    lv=[Vector(tuple(v[k]for k in 'xyz'))for v in landing['vertices']];lt=BVHTree.FromPolygons(lv,[landing['triangles'][i:i+3]for i in range(0,len(landing['triangles']),3)],all_triangles=True)
    edge=[]
    for i in range(27):
        z=-33.6+i*.1;hits=[]
        for j in range(1601):
            x=-159+j*.005;p,n,idx,d=lt.ray_cast(Vector((x,base+.1,z)),Vector((0,-1,0)),.2)
            if p is not None:hits.append(x)
        if hits:edge.append((z,min(hits),max(hits)))
    # Add a narrow western extension, continuous with existing landing. Its
    # eastern edge overlaps the original polygon by1cm, never the lower treads.
    verts=[];faces=[]
    for z,lo,hi in edge:
        west=-157.3;east=lo+.01
        verts.extend([(west,z,base-.35),(east,z,base-.35),(west,z,base),(east,z,base)])
    for i in range(len(edge)-1):
        j=i*4;k=j+4;faces.extend([(j+2,j+3,k+3,k+2),(j,k,k+1,j+1),(j,j+2,k+2,k),(j+1,k+1,k+3,j+3)])
    faces.extend([(0,1,3,2),(len(verts)-4,len(verts)-2,len(verts)-1,len(verts)-3)])
    # Above face order is native x/y/z construction mapped into Blender x/z/y.
    o=mesh('k008-landing14-width-extension',verts,faces,paving,'stone');o['kyoto_role']='garden-access'
    # Low landing approach is open toward its existing arrival; guard exposed
    # edges of the new turning apron without blocking the 2.6m stair throat.
    slab('apron-west-guard',(-157.35,-157.3,base,base+1.1,-33.6,-31),glass,'glass')
    slab('apron-south-guard',(-157.35,-154.3,base,base+1.1,-33.65,-33.6),glass,'glass')
    # Full sloped side infill prevents a small ball escaping between stair
    # posts; supplied handrails remain visible and collidable above it.
    for side in [-1,1]:
        x=-156+side*1.3;x0,x1=sorted([x,x+side*.035]);v=[]
        for z,y in [(-31,base),(-22.32,top)]:v.extend([(x0,z,y-.30),(x1,z,y-.30),(x0,z,y+.90),(x1,z,y+.90)])
        f=[(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)]
        o=mesh('k008-stair-side-infill-'+str(side),v,f,glass,'glass');o['kyoto_role']='garden-guard'
    return {'sourceMetadata':metadata,'fit':{'north':[nm,nb],'south':[sm,sb],'facadeSeparation':.35,'fittedSouthEnds':south_ends,'fittedNorthEnds':north_ends,'stairStructuralWidth':2.6,'stairZ':[-31,-22.32],'floorY':top,'lowerY':base},'imported':summary,'landingExtensionSections':edge}
