"""Build continuous handrail meshes and solid return-chain end pockets.
Called by repair_atrium_structure.py on a candidate .blend and matching layout.
Public tread motion is retained verbatim; enclosure dimensions derive from the
whole swept box, including longitudinal half-pitch at the inclined return run.
"""
import math,bpy
from mathutils import Vector

def simplify(points,tolerance=.0001):
    if len(points)<3:return points
    a,b=points[0],points[-1];direction=b-a
    distances=[(p-(a+direction*max(0,min(1,(p-a).dot(direction)/direction.length_squared)))).length for p in points]
    far=max(range(len(points)),key=lambda i:distances[i])
    if distances[far]<=tolerance:return [a,b]
    return simplify(points[:far+1],tolerance)[:-1]+simplify(points[far:],tolerance)

def build(layout,mesh,materials):
    removed=[];envelopes=[]
    native=lambda p:(p[0],p[2],p[1])
    steel=materials['Atrium | satin gate stainless steel']
    rubber=next(m for m in bpy.data.materials if 'rubber' in m.name.lower())
    faces=[(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)]
    for lane in layout['escalators']:
        name=lane['id'];c=Vector(tuple(lane['lowerCenter'][k]for k in 'xyz'));u=Vector(tuple(lane['uphill'][k]for k in 'xyz'));side=Vector((u.z,0,-u.x))
        world=lambda p:c+side*p[0]+Vector((0,p[1],0))+u*p[2]
        def make(suffix,v,f,physical='steel',collision=True,smooth=False):
            return mesh(name+suffix,[native(world(p))for p in v],[tuple(reversed(t))for t in f],rubber if physical=='rubber' else steel,physical,collision,smooth)
        path=[Vector(tuple(p[k]for k in 'xyz'))for p in lane['path']];public=path[:lane['publicPointCount']]
        pitch=sum((b-a).length for a,b in zip(path,path[1:]))/lane['stepCount'];half=lane['width']/2
        public=simplify(public)
        slope=max(abs((b.y-a.y)/(b.z-a.z))for a,b in zip(public,public[1:]))
        # Return tread top is 0.8 m below public path, and solid depth is 0.24.
        # Include slope times half-pitch so *corners*, not just centres, fit.
        depth=.8+lane['stepHeight']+slope*pitch/2+.06
        def slab(suffix,x0,x1,y0,y1,z0,z1,collision=True):
            v=[(x,y,z)for x,y,z in [(x0,y0,z0),(x0,y0,z1),(x0,y1,z0),(x0,y1,z1),(x1,y0,z0),(x1,y0,z1),(x1,y1,z0),(x1,y1,z1)]]
            return make(suffix,v,faces,collision=collision)
        def swept(suffix,x0,x1,bottom,top,collision):
            v=[];f=[]
            for p in public:v.extend([(x0,p.y+bottom,p.z),(x1,p.y+bottom,p.z),(x0,p.y+top,p.z),(x1,p.y+top,p.z)])
            for i in range(len(public)-1):
                j=i*4;k=j+4
                f.extend([(j+2,j+3,k+3,k+2),(j,k,k+1,j+1),(j,j+2,k+2,k),(j+1,k+1,k+3,j+3)])
            f.extend([(0,1,3,2),(len(v)-4,len(v)-2,len(v)-1,len(v)-3)])
            return make(suffix,v,[tuple(reversed(t))for t in f],collision=collision)
        # Render the native BuildDeck outer boundary; no duplicate collider for
        # its retained three solids. Extend the shallow undertray with one solid.
        swept('-public-undertray-visible',-half-.05,half+.05,-1.08,-.30,False)
        swept('-public-left-casing-visible',-half-.05,-half-.004,-1.08,.04,False)
        swept('-public-right-casing-visible',half+.004,half+.05,-1.08,.04,False)
        swept('-return-undertray-extension',-half-.05,half+.05,-depth,-1.08,True)
        low=min(p.z for p in path)-pitch/2-.06;high=max(p.z for p in path)+pitch/2+.06
        for end,z0,z1,y in [('lower',low,public[0].z+.02,0),('upper',public[-1].z-.02,high,lane['height'])]:
            slab('-'+end+'-pit-bottom',-half-.05,half+.05,y-depth-.06,y-depth,z0,z1)
            slab('-'+end+'-pit-left',-half-.05,-half-.004,y-depth,y-.002,z0,z1)
            slab('-'+end+'-pit-right',half+.004,half+.05,y-depth,y-.002,z0,z1)
            a,b=(z0,z0+.06)if end=='lower'else(z1-.06,z1)
            slab('-'+end+'-pit-end',-half-.05,half+.05,y-depth,y-.002,a,b)
            a,b=(z0,public[0].z)if end=='lower'else(public[-1].z,z1)
            slab('-'+end+'-pit-cover',-half-.05,half+.05,y-.035,y-.002,a,b)
            comb=name+'-'+end+'-comb-transfer'
            if comb not in bpy.data.objects:
                overlap=pitch/2+.06
                a,b=(public[0].z-.02,public[0].z+overlap)if end=='lower'else(public[-1].z-overlap,public[-1].z+.02)
                slab('-'+end+'-comb-transfer',-half-.05,half+.05,y-.035,y+.002,a,b)
        # One connected sweep per visible handrail; no individual capped arc
        # segments. Use the shared smooth public profile for slope transitions.
        for obj in list(bpy.context.scene.objects):
            if obj.name.startswith(name+'-') and any(k in obj.name for k in ['-handrail','-belt-return']):
                removed.append(obj.get('kyoto_surface',obj.name));bpy.data.objects.remove(obj,do_unlink=True)
        for sign in [-1,1]:
            x=sign*(half+.075);curve=[]
            zlower=-.65;zupper=lane['run']+.6
            for i in range(49):
                angle=-math.pi/2+math.pi*i/48
                curve.append(Vector((x,.75+.25*math.sin(angle),zlower-.25*math.cos(angle))))
            curve.extend(Vector((x,p.y+1,p.z))for p in public if zlower<p.z<zupper)
            for i in range(49):
                angle=math.pi/2-math.pi*i/48
                curve.append(Vector((x,lane['height']+.75+.25*math.sin(angle),zupper+.25*math.cos(angle))))
            v=[];f=[];sections=16;radius=.048
            for i,p in enumerate(curve):
                t=(curve[min(i+1,len(curve)-1)]-curve[max(0,i-1)]).normalized();n=Vector((0,t.z,-t.y))
                for j in range(sections):
                    angle=j*math.tau/sections;v.append(p+Vector((radius*math.cos(angle),0,0))+n*(radius*math.sin(angle)))
            for i in range(len(curve)-1):
                for j in range(sections):
                    k=(j+1)%sections;f.append((i*sections+j,i*sections+k,(i+1)*sections+k,(i+1)*sections+j))
            f.extend([tuple(reversed(range(sections))),tuple((len(curve)-1)*sections+j for j in range(sections))])
            make('-continuous-handrail-'+str(sign),v,f,'rubber',True,True)
        envelopes.append({'id':name,'pitch':pitch,'depth':depth,'zBounds':[low,high],'halfWidth':half+.05,'publicPoints':lane['publicPointCount'],'motionChanged':False})
    remove=set(removed)
    # Legacy compact beams can repeat surface IDs. All old segments sharing the
    # replaced rail ID are intentionally removed, across primitive families.
    for kind in ['panels','boxes','beams']:layout[kind]=[p for p in layout[kind]if p['id']not in remove]
    return sorted(remove),envelopes
