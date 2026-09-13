"""Small native-metre authoring kit; visible meshes are the collision authority.

Native +X east, +Y up, +Z north. A zone's yaw turns local +Z into its
inward direction. No Blender operators per fixture, no hidden collision shells.
"""
import math
import bpy
from mathutils import Vector

FACES = [(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)]


class Builder:
    def __init__(self, layout):
        self.layout = layout
        self.collection = bpy.data.collections.new('Station public spaces / September 2026')
        bpy.context.scene.collection.children.link(self.collection)
        self.objects, self.solids, self.labels, self.routes, self.views, self.removed = [], [], [], [], [], []
        self.materials = {}
        self.zone('station', (0,0,0))

    def material(self, name, color, rough=.55, metal=0, alpha=1, emit=0, physical='stone'):
        full = 'station-additions-'+name
        rgb = [(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4) for v in color]
        m = bpy.data.materials.new(full); m.use_nodes = True
        p = m.node_tree.nodes.get('Principled BSDF')
        for key, value in [('Base Color',(*rgb,alpha)),('Roughness',rough),('Metallic',metal),('Alpha',alpha),('Emission Color',(*rgb,1)),('Emission Strength',emit)]:
            p.inputs[key].default_value = value
        if alpha<1: m.surface_render_method='DITHERED'
        self.materials[name] = m
        self.layout['authoredMaterials'].append(dict(id=full,label=full,physical=physical,linearColor=dict(zip('rgba',(*rgb,alpha))),roughness=rough,metallic=metal,alpha=alpha,emission=emit,emissionColor=dict(zip('rgb',rgb))))

    def zone(self, name, origin=(0,0,0), yaw=0):
        self.prefix, self.origin, self.yaw = 'add-'+name+'-', origin, yaw

    def doorway(self, surface, left, right, bottom, top):
        """Cut a real opening in an existing axis-aligned wall, both exports."""
        r=next(r for r in self.layout['boxes'] if r['id']==surface)
        assert r.get('yaw',0)==0
        c,s=r['center'],r['size'];x0,x1=c['x']-s['x']/2,c['x']+s['x']/2;y0,y1=c['y']-s['y']/2,c['y']+s['y']/2
        assert x0<=left<right<=x1 and y0<=bottom<top<=y1
        material=bpy.data.objects[surface].data.materials[0]
        self.remove(lambda n:n==surface);key='retained-'+surface;self.materials[key]=material
        old=(self.prefix,self.origin,self.yaw);self.zone('opening-'+surface)
        for name,a,b,d,e in [('left',x0,left,y0,y1),('right',right,x1,y0,y1),('sill',left,right,y0,bottom),('head',left,right,top,y1)]:
            if b-a>.00001 and e-d>.00001:
                obj=self.box(name,((a+b)/2,(d+e)/2,c['z']),(b-a,e-d,s['z']),key,role=r['role'])
                obj['kyoto_physical']=r['material'];self.solids[-1]['material']=r['material']
        self.prefix,self.origin,self.yaw=old

    def world(self, p):
        a=math.radians(self.yaw);c,s=math.cos(a),math.sin(a)
        return (self.origin[0]+c*p[0]+s*p[2],self.origin[1]+p[1],self.origin[2]-s*p[0]+c*p[2])

    def mesh(self, name, vertices, faces, material='ivory', collision=True, role='station fixture', smooth=False):
        full=self.prefix+name
        points=[self.world(p) for p in vertices]
        center=tuple(sum(p[k]for p in points)/len(points)for k in range(3))
        data=bpy.data.meshes.new(full)
        data.from_pydata([(p[0]-center[0],p[2]-center[2],p[1]-center[1])for p in points],[],[tuple(reversed(f))for f in faces]);data.update()
        obj=bpy.data.objects.new(full,data);obj.location=(center[0],center[2],center[1]);self.collection.objects.link(obj)
        data.materials.append(self.materials[material]);obj['kyoto_surface']=full;obj['kyoto_collision']=collision;obj['kyoto_physical']='steel' if material in ['steel','mirror','graphite'] else 'wood' if material=='oak' else 'glass' if material in ['glass','frosted'] else 'stone';obj['kyoto_role']=role
        if smooth:
            for p in data.polygons:p.use_smooth=True
        self.objects.append(obj)
        if collision:self.panel_record(obj,role)
        return obj

    def panel_record(self,obj,role):
        # Use the actual float32 Blender vertex positions, including transforms.
        obj.data.calc_loop_triangles()
        points=[obj.matrix_basis@v.co for v in obj.data.vertices]
        r=dict(id=obj.name,vertices=[dict(x=p.x,y=p.z,z=p.y)for p in points],triangles=[i for t in obj.data.loop_triangles for i in reversed(t.vertices)],material=obj.get('kyoto_physical','stone'),appearance=obj.data.materials[0].name,role=role,collision=True)
        self.layout['panels'].append(r);self.solids.append(r)
        return r

    def box(self,name,c,size,material='ivory',collision=True,role='station fixture'):
        vertices=[tuple(c[i]+d[i]*size[i]/2 for i in range(3))for d in [(x,y,z)for x in [-1,1]for y in [-1,1]for z in [-1,1]]]
        obj=self.mesh(name,vertices,FACES,material,False,role)
        obj['kyoto_collision']=collision
        if collision:
            r=dict(id=obj.name,center=dict(zip('xyz',self.world(c))),size=dict(zip('xyz',size)),yaw=self.yaw,material=obj['kyoto_physical'],appearance=obj.data.materials[0].name,role=role,collision=True)
            self.layout['boxes'].append(r);self.solids.append(r)
        return obj

    def cylinder(self,name,c,radius,height,material='steel',collision=True,segments=24):
        vertices=[(c[0]+radius*math.cos(i*math.tau/segments),c[1]+h,c[2]+radius*math.sin(i*math.tau/segments))for h in [-height/2,height/2]for i in range(segments)]
        faces=[tuple(reversed(range(segments))),tuple(range(segments,segments*2))]+[(i,(i+1)%segments,(i+1)%segments+segments,i+segments)for i in range(segments)]
        # Native coordinate winding is corrected below by mesh().
        faces=[tuple(reversed(f))for f in faces]
        return self.mesh(name,vertices,faces,material,collision,smooth=True)

    def rod(self,name,a,b,r=.025,material='steel',collision=True,segments=8):
        av,bv=Vector(a),Vector(b);axis=(bv-av).normalized();u=axis.cross(Vector((0,1,0)))
        if u.length<.01:u=axis.cross(Vector((1,0,0)))
        u.normalize();v=axis.cross(u)
        pts=[tuple(p+r*(u*math.cos(i*math.tau/segments)+v*math.sin(i*math.tau/segments)))for p in [av,bv]for i in range(segments)]
        fs=[tuple(reversed(range(segments))),tuple(range(segments,2*segments))]+[(i,(i+1)%segments,(i+1)%segments+segments,i+segments)for i in range(segments)]
        return self.mesh(name,pts,fs,material,collision,smooth=True)

    def label(self,name,c,w,h,ja,en='',kind='service',face='north',accent='#dac396',**extra):
        self.labels.append(dict(id=self.prefix+name,center=list(self.world(c)),width=w,height=h,kind=kind,face=face,yaw=self.yaw,ja=ja,en=en,accent=accent,**extra))

    def sign(self,name,c,w,h,ja,en='',kind='service',face='north',accent='#dac396',**extra):
        size=(w,h,.06)if face in ['north','south']else(.06,h,w)
        self.box(name,c,size,'graphite',role='mounted sign')
        p=list(c);p[2 if face in ['north','south']else 0]+=.037*(1 if face in ['north','east']else -1)
        self.label(name,p,w-.04,h-.04,ja,en,kind,face,accent,**extra)

    def rail(self,name,a,b,height=1.15,glass=True):
        length=math.dist(a,b);n=math.ceil(length/1.8)
        for i in range(n+1):
            p=tuple(a[k]+(b[k]-a[k])*i/n for k in range(3))
            self.rod(f'{name}-post-{i}',p,(p[0],p[1]+height,p[2]),.025)
        self.rod(name+'-cap',(a[0],a[1]+height,a[2]),(b[0],b[1]+height,b[2]),.032)
        if glass:
            # Thin solid panes, with a continuous toe and safe gaps at posts.
            for i in range(n):
                p=tuple(a[k]+(b[k]-a[k])*(i+.03)/n for k in range(3));q=tuple(a[k]+(b[k]-a[k])*(i+.97)/n for k in range(3));dx,dz=q[0]-p[0],q[2]-p[2];d=math.hypot(dx,dz);nx,nz=-dz/d*.009,dx/d*.009
                vs=[(v[0]+s*nx,v[1]+h,v[2]+s*nz)for v in [p,q]for h in [.07,height-.06]for s in [-1,1]]
                self.mesh(f'{name}-pane-{i}',vs,FACES,'glass',True,'glass guard')

    def bench(self,name,x,y,z,length=2.4):
        for dx in [-length*.32,length*.32]:self.box(f'{name}-foot-{dx}',(x+dx,y+.19,z),(.13,.38,.58),'graphite')
        for j in range(6):self.box(f'{name}-slat-{j}',(x,y+.43,z+(j-2.5)*.098),(length,.07,.088),'oak')

    def table(self,name,x,y,z):
        self.cylinder(name+'-base',(x,y+.04,z),.32,.08,'graphite')
        self.cylinder(name+'-stem',(x,y+.39,z),.035,.70,'steel',segments=12)
        self.cylinder(name+'-top',(x,y+.76,z),.43,.06,'oak',segments=32)
        for i in [-1,1]:
            self.box(name+f'-seat-{i}',(x,y+.44,z+i*.78),(.42,.07,.42),'oak')
            self.box(name+f'-back-{i}',(x,y+.71,z+i*.98),(.42,.57,.035),'oak')
            for dx in [-.16,.16]:self.box(name+f'-leg-{i}-{dx}',(x+dx,y+.21,z+i*.78),(.035,.42,.35),'graphite')

    def stairs(self,name,a,b,width):
        # Axis-aligned flights; risers <=18cm, actual steps support both actors.
        assert a[0]==b[0] or a[2]==b[2]
        n=math.ceil(abs(b[1]-a[1])/.18);distance=math.hypot(b[0]-a[0],b[2]-a[2]);run=distance/n
        assert run>=.26,(name,run)
        for i in range(n):
            t=(i+.5)/n;y=a[1]+(b[1]-a[1])*(i+1)/n
            c=[a[k]+(b[k]-a[k])*t for k in range(3)];c[1]=y-.10
            self.box(f'{name}-step-{i}',c,(width,.2,run)if a[0]==b[0]else(run,.2,width),'stone',role='public stair tread')
        dx,dz=b[0]-a[0],b[2]-a[2];length=math.hypot(dx,dz)
        for side in [-1,1]:
            shift=(dz/length*width*.5*side,-dx/length*width*.5*side)
            self.rail(name+f'-guard-{side}',(a[0]+shift[0],a[1],a[2]+shift[1]),(b[0]+shift[0],b[1],b[2]+shift[1]))

    def route(self,name,points):
        self.routes.append(dict(id=self.prefix+name,points=[dict(zip('xyz',self.world(p)))for p in points]))

    def view(self,name,position,target,reference,anchors):
        self.views.append(dict(id=self.prefix+name,position=dict(zip('xyz',self.world(position))),target=dict(zip('xyz',self.world(target))),fov=65,reference=reference,anchors=anchors,status='Operator-plan topology; human-scale photo interpretation, not surveyed metric registration'))

    def remove(self,predicate):
        ids={r['id']for key in ['boxes','panels','beams']for r in self.layout[key]if predicate(r['id'])}
        ids|={o.name for o in bpy.context.scene.objects if predicate(o.name)}
        for key in ['boxes','panels','beams']:
            self.layout[key]=[r for r in self.layout[key]if r['id']not in ids]
        for name in ids:
            obj=bpy.data.objects.get(name)
            if obj:bpy.data.objects.remove(obj,do_unlink=True)
        self.solids=[r for r in self.solids if r['id']not in ids]
        self.objects=[o for o in self.objects if o.name not in ids] if not ids else [o for o in self.collection.objects]
        self.removed.extend(sorted(ids))
        self.labels=[r for r in self.labels if r['id']not in ids]

    def light(self,name,c):
        self.layout['authoredLights'].append(dict(id=self.prefix+name,position=dict(zip('xyz',self.world(c))),direction=dict(x=0,y=-1,z=0),range=12,intensity=16,color=dict(r=1,g=.86,b=.66)))


def palette(b):
    for name,color,rough,metal,alpha,emit in [
        ('ivory',(.80,.80,.75),.53,0,1,0),('stone',(.39,.44,.43),.46,0,1,0),
        ('dark-stone',(.18,.24,.23),.35,0,1,0),('rose',(.59,.47,.39),.54,0,1,0),
        ('graphite',(.16,.19,.20),.43,.25,1,0),('steel',(.64,.69,.68),.28,.85,1,0),
        ('mirror',(.84,.88,.88),.14,1,1,0),('oak',(.62,.42,.24),.58,0,1,0),
        ('glass',(.68,.84,.82),.16,.03,.18,0),('frosted',(.68,.77,.74),.5,0,.78,0),
        ('yellow',(.86,.68,.21),.48,.1,1,0),('green',(.04,.42,.23),.45,0,1,.15),
        ('orange',(.94,.39,.08),.5,0,1,.2),('red',(.71,.10,.10),.42,0,1,.12),
        ('white',(.92,.93,.87),.65,0,1,0),('light',(.98,.93,.80),.5,0,1,2),
        ('blue',(.13,.35,.54),.5,0,1,0),('leaf',(.22,.39,.15),.87,0,1,0),
        ('leaf-light',(.38,.52,.20),.85,0,1,0),('leaf-dark',(.10,.25,.13),.9,0,1,0),
        ('turf',(.22,.39,.23),.94,0,1,0),('soil',(.22,.20,.14),.95,0,1,0),
        ('garden-paving',(.70,.64,.59),.66,0,1,0),
    ]:b.material(name,color,rough,metal,alpha,emit,physical='steel'if name in ['steel','mirror','graphite']else'wood'if name=='oak'else'glass'if name in ['glass','frosted']else'stone')
