"""Connected public circulation: K043, K044, K045, K046, K047, K033."""
import math
from ground import shop, ceiling_bay, tactile, tactile_junction

MAP2='https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/floorguide/img/map/img_map_2f.svg'
PHOTO='https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/square/img/'


def passage(b):
    b.zone('passage2f',(-63,7.35,-21))
    b.box('floor',(0,-.17,-26.25),(12,.34,67.5),'stone',role='north south public passage')
    for i,z in enumerate([-5,-11,-17,-23,-29,-35,-41,-47,-53]):
        ceiling_bay(b,'bay-'+str(i),0,4.1,z,10.5,6)
        b.box('yellow-column-panel-'+str(i),(-5.27,2.65,z+.54),(.78,1.9,.045),'yellow',False)
    # Railings enclose the southern terminal; north is the retained 2F landing.
    for side,segments in [(-1,[(7.5,-41.5),(-50.5,-60)]),(1,[(7.5,-2),(-24,-28.5),(-37.5,-60)])]:
        for i,(a,c)in enumerate(segments):b.box(f'wall-{side}-{i}',(side*6.1,2.05,(a+c)/2),(.20,4.1,abs(c-a)),'ivory')
    b.sign('north-directory',(0,3.0,-3),5.5,.58,'↑ 八条口・新幹線　　西口改札 →','SOUTH / HACHIJO · SHINKANSEN',face='north',accent='#efd464')
    b.sign('return-directory',(0,3.0,-44),5.5,.58,'烏丸口・京都タワー ↑','NORTH / KARASUMA · KYOTO TOWER',face='south',accent='#efd464')
    b.route('north-south',[(0,0,8.5),(0,0,-11),(0,0,-28),(0,0,-52),(0,0,-58)])
    b.view('north-arrival',(0,1.65,-1),(0,1.65,-27),PHOTO+'img_pedestrianwalkway_01.jpg',['retained 2F west landing','West Gate east branch','banded columns and lamp axis'])
    b.view('return',(1,1.65,-41),(0,2,-9),PHOTO+'img_pedestrianwalkway_01.jpg',['north route','west retail edge','yellow column panels'])
    for i,(a,c)in enumerate([(-22,-53.8),(-54.2,-66.8),(-67.2,-79)]):tactile(b,'passage-tactile-'+str(i),(-63,7.35,a),(-63,7.35,c))
    tactile(b,'passage-west-gate',(-62.8,7.35,-54),(-57.8,7.35,-54))
    tactile(b,'passage-porta',(-63.2,7.35,-67),(-68.7,7.35,-67))
    for i,z in enumerate([-54,-67]):tactile_junction(b,'passage-junction-'+str(i),(-63,7.35,z))
    # South access to the outside forecourt, with a resting landing midflight.
    b.zone('south-exit')
    b.stairs('upper',(-63,3.675,-89),(-63,7.35,-81),5)
    b.box('midlanding',(-63,3.535,-90),(6,.28,2),'stone',role='south entry landing')
    b.stairs('lower',(-63,0,-100),(-63,3.675,-91),5)
    b.box('forecourt',(-63,-.18,-103),(14,.36,6),'stone',role='south forecourt')
    b.sign('entry',(-63,2.5,-102),5,.65,'京都駅　八条口','KYOTO STATION · HACHIJO',face='south',accent='#e6d8b5')
    for x in [-65.7,-60.3]:b.box('sign-support-'+str(x),(x,1.4,-102),(.12,2.8,.12),'steel')
    b.zone('west-gate',(-57,7.35,-54),90)
    b.box('paid-floor',(0,-.16,3),(9,.32,6),'stone')
    b.box('back',(0,2.3,6),(9,4.6,.15),'ivory')
    for i in range(6):
        x=(i-2.5)*1.22;b.box('unit-'+str(i),(x,.49,.4),(.3,.98,1.4),'steel')
        if i<5:b.box('closed-flap-'+str(i),(x+.60,.62,.15),(.87,.64,.065),'blue')
    b.sign('gate-name',(0,2.9,.20),7.5,.68,'JR 京都駅　西口','JR KYOTO · WEST GATE',face='south',accent='#85b392')
    b.sign('paid-sign',(0,3.8,5.85),6,.6,'のりば　嵯峨野線・京都線','PLATFORMS',face='south')
    shop(b,'porta2f',(-69,7.35,-67),-90,8.5,4.9,'Porta','KYOTO GIFTS · FOOD',color='#d8769a')
    b.routes[-1]['points'][0]['z']+=.6
    for x in [-2.8,2.8]:
        b.box('gift-table-'+str(x),(x,.46,2.5),(1.3,.92,1.5),'oak')
        for i in range(6):b.box(f'gift-box-{x}-{i}',(x+(i%3-1)*.35,1.03,2.2+(i//3)*.6),(.29,.22,.4),'white'if i%2 else'red',False)


def west_square(b):
    b.zone('westsquare',(-51,7.35,-34))
    b.box('floor',(3,-.18,0),(18,.36,22),'ivory',role='West Square foyer')
    # Curved upper gallery, with a continuous patterned fascia.
    n=32;radius=10.0
    for i in range(n):
        a=(i/n)*math.pi;c=((i+1)/n)*math.pi
        vs=[(r*math.cos(t),y,r*math.sin(t))for r in [radius-.7,radius]for y in [4.05,5.35]for t in [a,c]]
        from geometry import FACES
        b.mesh('curved-balcony-'+str(i),vs,FACES,'ivory')
        below=[(r*math.cos(t),y,r*math.sin(t))for r in [radius-.13,radius+.08]for y in [0,4.04]for t in [a,c]]
        b.mesh('curved-ground-wall-'+str(i),below,FACES,'ivory')
        if i not in [3,4,5,6]:
            upper=[(r*math.cos(t),y,r*math.sin(t))for r in [radius-.06,radius+.10]for y in [5.35,7.74]for t in [a,c]]
            b.mesh('curved-upper-wall-'+str(i),upper,FACES,'ivory')
        mid=(a+c)/2
        # The atlas plane faces the centre of the room; separate narrow panels
        # follow the actual curved support without a coplanar duplicate face.
        old=(b.prefix,b.origin,b.yaw)
        b.zone('westsquare-pattern',(-51+(radius-.713)*math.cos(mid),7.35,-34+(radius-.713)*math.sin(mid)),90-math.degrees(mid))
        b.label('panel-'+str(i),(0,4.7,-.003),.90,1.24,'','','diamond',face='south')
        b.prefix,b.origin,b.yaw=old
        p=(radius-.62)*math.cos(a);q=(radius-.62)*math.sin(a)
        b.rod('balcony-post-'+str(i),(p,5.35,q),(p,6.34,q),.022)
        b.rod('balcony-cap-'+str(i),(p,6.34,q),((radius-.62)*math.cos(c),6.34,(radius-.62)*math.sin(c)),.029)
    for i,x in enumerate([-7,0,7]):b.cylinder('polished-column-'+str(i),(x,3.875,-1.7),.34,7.75,'mirror',segments=48)
    b.box('ceiling',(3,7.85,0),(18,.22,22),'ivory')
    for i in range(25):
        x=-5.5+i*.70;b.box('ceiling-rib-'+str(i),(x,7.65,0),(.12,.22,21.6),'graphite')
        if i%3==0:
            for z in [-6,0,6]:b.cylinder(f'downlight-{i}-{z}',(x+.28,7.72,z),.11,.022,'light',False,16)
    b.box('rear-wall',(3,3.9,-10.8),(18,7.8,.18),'dark-stone')
    b.box('east-wall',(11.9,3.9,0),(.18,7.8,22),'ivory')
    for i,x in enumerate([-2.7,3,8.7]):
        b.box('shop-frame-'+str(i),(x,1.65,-10.60),(5.7,3.3,.18),'ivory')
        for j in range(34):b.box(f'shutter-{i}-{j}',(x,.08+j*.091,-10.49),(5.3,.076,.028),'white',False)
        b.sign('retail-'+str(i),(x,3.52,-10.45),5.3,.38,'Porta'if i!=1 else'西口広場','KYOTO STATION · WEST SQUARE',accent='#decaaa')
    b.sign('entrance',(-9.5,3.2,-6.5),3.5,.45,'西口広場','WEST SQUARE',face='west')
    b.route('entry',[(-12.5,0,-2),(-9,0,-2),(-7,0,-5),(4,0,-5)])
    b.view('approach',(-11,1.7,-6),(1,3,4),PHOTO+'img_westsquare_01.jpg',['north south passage west opening','curved balcony','three cylindrical columns'])
    b.view('reverse',(8,1.7,5),(-7,3,-7),PHOTO+'img_westsquare_01.jpg',['shutter frontage','balcony return','slatted ceiling'])
    # Side stair joins the upper gallery and makes the balcony usable.
    b.stairs('gallery-stair',(10.8,0,-9),(10.8,5.35,3),2.0)
    b.box('gallery-landing',(10.3,5.206,4.5),(3.8,.30,3),'ivory')
    b.route('gallery',[(10.8,0,-9.5),(10.8,0,-9),(10.8,5.35,3),(9.5,5.356,4.6),(8,5.35,5.5)])
    b.light('foyer',(-4,7.6,-2))


def theater(b):
    # Retained low east-passage sign is a direction marker, not the 2F theater.
    b.zone('theater2f',(65,7.35,-9))
    b.box('foyer',(2,-.18,0),(14.6,.36,16),'stone',role='theater foyer')
    b.box('ceiling',(0,4.4,0),(18,.20,16),'ivory')
    b.box('rear',(0,2.2,-7.9),(18,4.4,.18),'ivory')
    for x in [-3.9,-1.3,1.3,3.9]:
        b.box('theater-door-'+str(x),(x,1.45,-7.76),(2.42,2.9,.1),'graphite')
        b.box('door-window-'+str(x),(x,1.86,-7.695),(1.95,.9,.025),'glass')
        b.box('push-bar-'+str(x),(x,1.05,-7.65),(1.8,.04,.07),'steel')
    b.sign('identity',(0,3.63,-7.68),10.6,.86,'京都劇場','KYOTO THEATER',accent='#ce754c')
    for i,x in enumerate([-7,-5.5,5.5,7]):b.sign('poster-'+str(i),(x,1.8,-7.7),1.04,1.48,'京都劇場','PERFORMING ARTS','poster',index=i)
    b.box('ticket-counter',(-6, .58,4),(3,1.16,.90),'oak')
    b.box('ticket-window',(-6,1.74,4.45),(3,1.16,.026),'glass')
    b.sign('tickets',(-6,2.62,4.40),2.9,.40,'チケットカウンター','BOX OFFICE',face='south')
    for x in [-5,0,5]:b.box('ceiling-light-'+str(x),(x,4.26,0),(.26,.06,9),'light',False)
    b.rail('north-edge',(-9,0,8),(9,0,8))
    b.stairs('entry',(-9,5.5-7.35,3),(-5.3,0,3),3)
    b.box('stair-approach',(-11.25,5.5-7.35-.13,3),(4.5,.26,3),'stone')
    b.box('frontage-link',(-15,5.5-7.35-.13,5),(3,.26,5),'stone')
    b.sign('approach-marker',(-11,1.2,3),2.6,.5,'京都劇場 →','THEATER · 2F',face='west')
    b.route('arrival',[(-12,5.5-7.35,3),(-9,5.5-7.35,3),(-5.3,0,3),(0,0,2)])
    b.view('foyer',(-7,1.7,5),(1,2,-7),MAP2,['east staircase arrival','theater entrance doors','restaurant branch east'])
    b.view('reverse',(5,1.7,-4),(-5,2,3),MAP2,['box office','arrival stair','open foyer'])
    shop(b,'washoku2f',(74,7.35,-8),90,8.0,6.3,'和食小路','WASHOKU KOJI',color='#caa569')
    for x in [-2.6,2.6]:
        b.box('entry-slat-'+str(x),(x,1.6,.4),(.15,3.2,.15),'oak')
        b.table('dining-'+str(x),x,0,3.5)
    for i in range(9):b.box('noren-'+str(i),((i-4)*.45,2.53,.20),(.42,.70,.015),'blue',False)
    b.sign('directory',(0,1.7,6.18),4.8,1.6,'和食小路','DINING IN KYOTO','directory',face='south')


def promenade_and_wood(b):
    y3=15.5;y4=19.585964912280705
    b.zone('promenade3f')
    # Existing south approach starts at (-68.45,15.5,-36.7). Route extends
    # around the outside south edge, joining the east 3F landing from behind.
    b.box('long-floor',(0,y3-.18,-42.5),(142,.36,7),'ivory',role='south promenade')
    b.box('west-link',(-68.2,y3-.18,-38),(5.6,.36,4),'stone')
    b.box('east-link',(65,y3-.18,-29),(5.8,.36,20),'ivory')
    b.box('east-landing-link',(59,y3-.18,-18),(17.8,.36,4),'ivory')
    b.remove(lambda n:n.startswith('east-third-south-guard'))
    b.doorway('south-concourse-continuous-stone-band',62.4,66.8,15.5,18.0)
    for i in range(71):
        x=-70+i*2
        b.box('parapet-pier-'+str(i),(x,y3+.73,-46),( .45,1.46,.30),'ivory')
        b.box('parapet-head-'+str(i),(x+1,y3+1.35,-46),(1.6,.24,.30),'ivory')
        b.box('opening-guard-'+str(i),(x+1,y3+.64,-46),(1.55,1.12,.025),'glass')
    for i in range(28):
        x=-67.5+i*5
        b.box('drain-'+str(i),(x,y3+.004,-44.1),(4.97,.008,.22),'graphite',False)
        for j in range(24):b.box(f'drain-slot-{i}-{j}',(x-2.39+j*.20,y3+.009,-44.1),(.035,.008,.19),'steel',False)
    # The lower south wall carries the 4F apertures; alternate stone coursing.
    for i in range(23):
        x=-55+i*5.2
        for row in range(5):b.box(f'wall-{i}-{row}',(x,y3+(row+.5)*.78,-38.9),(5.18,.774,.26),'ivory'if row<2 else'dark-stone')
    for x in [-57,52]:
        b.box('planter-'+str(x),(x,y3+.32,-43),(3,.64,.8),'ivory')
        for i in range(9):b.cylinder(f'plant-{x}-{i}',(x-1.2+i*.30,y3+.88,-43),.24,.55,'leaf',False,8)
    b.rail('east-outer',(67.9,y3,-39),(67.9,y3,-20))
    b.rail('east-inner',(62.1,y3,-39),(62.1,y3,-20))
    b.route('through',[(-69.45,y3,-37.2),(-68.2,y3,-42),(65,y3,-42),(65,y3,-18),(60,y3,-18),(60,y3,-16.8),(54,y3,-16.8),(54,y3,-14)])
    b.view('west',(-64,y3+1.65,-42.3),(25,y3+1.65,-42.3),PHOTO+'img_southpromenade_01.jpg',['south building edge','4F stair branch','pier and aperture parapet'])
    b.view('east',(62,y3+1.65,-42.3),(-40,y3+1.65,-42.3),PHOTO+'img_southpromenade_01.jpg',['east 3F link','continuous drain','south-facing rail view'])
    b.zone('wood4f',(5,y4,-30))
    b.box('floor',(0,-.18,0),(118,.36,15.4),'stone',role='south wood square')
    connection=next(r for r in b.layout['boxes'] if r['id']=='muromachi-south-connection')
    edge=connection['center']['x']+connection['size']['x']/2-5
    b.box('west-link',((edge-59)/2,-.18,0),(-59-edge,.36,7),'stone')
    b.box('east-link',(61.5,-.18,0),(5,.36,7),'stone')
    b.box('roof',(0,8.6,0),(118,.25,15.4),'graphite')
    for i in range(13):
        x=-55+i*9
        for z in [-5.9,6]:
            for band in range(10):b.box(f'column-{i}-{z}-{band}',(x,(band+.5)*.86,z),(1.1,.852,1.1),'ivory'if band%4!=2 else'dark-stone')
        b.box('roof-beam-'+str(i),(x,8.27,0),(.20,.45,15.1),'steel')
        if i<12:
            # Public square photograph: stone-framed south apertures and tall
            # upper windows, rather than an open car-park railing.
            px=x+4.5
            b.box('south-spandrel-'+str(i),(px,5.9,-6.0),(7.9,2.0,.34),'ivory')
            b.box('south-upper-glass-'+str(i),(px,7.6,-5.97),(7.9,1.35,.026),'glass')
            for side in [-1,1]:b.box(f'aperture-reveal-{i}-{side}',(px+side*3.75,2.45,-6.0),(.38,4.9,.7),'rose'if i%3==1 else'ivory')
            b.box('aperture-head-'+str(i),(px,4.73,-6.0),(7.1,.34,.7),'ivory')
            for j in [-1,0,1]:b.box(f'upper-mullion-{i}-{j}',(px+j*2.6,7.6,-5.94),(.04,1.35,.07),'steel')
    # Original soft peach ceiling form visible above the operator's play area.
    vs=[];fs=[];rings=12;segs=48
    for i in range(rings+1):
        a=-math.pi/2+i*math.pi/rings
        for j in range(segs):
            t=j*math.tau/segs;vs.append((7+5.5*math.cos(a)*math.cos(t),8.05+1.5*math.sin(a),-.5+2.6*math.cos(a)*math.sin(t)))
    for i in range(rings):
        for j in range(segs):fs.append((i*segs+j,(i+1)*segs+j,(i+1)*segs+(j+1)%segs,i*segs+(j+1)%segs))
    b.mesh('peach-ceiling-form',vs,fs,'rose',True,'ceiling form',True)
    # Rounded irregular turf outline as a shallow, collision-matched pad.
    pts=[(-14,-5),(-6,-6),(3,-5.4),(8,-3.3),(11,-2),(12,1.5),(9,4.8),(0,5),(-7,4),(-15,2.5),(-17,-.6)]
    vertices=[(x,y,z)for y in [0,.025]for x,z in pts];n=len(pts)
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n)for i in range(n)]
    b.mesh('turf',vertices,[tuple(reversed(f))for f in faces],'turf',True,'wood square turf')
    for i,(x,z) in enumerate([(-10,-1),(-2,2),(5,-1)]):
        b.rod('timber-log-'+str(i),(x-1.6,.43,z),(x+1.6,.43,z),.24,'oak',True,24)
        for dx in [-1,1]:b.box(f'log-foot-{i}-{dx}',(x+dx,.18,z),(.30,.36,.42),'oak')
    # Low triangular timber climbing form, matching all visible faces.
    b.mesh('timber-play',[(-3,.04,-2),(3,.04,-2),(0,1.45,-2),(-3,.04,-.5),(3,.04,-.5),(0,1.45,-.5)],[(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],'oak',True,'timber play form')
    # White hemisphere on its cylindrical plinth, observed at the turf edge.
    b.cylinder('dome-plinth',(18,.32,-1),2.25,.64,'ivory',segments=48)
    vs=[];rings=12;segs=48
    for row in range(rings+1):
        a=row/rings*math.pi/2
        for j in range(segs):vs.append((18+2.22*math.cos(a)*math.cos(j*math.tau/segs),.64+1.8*math.sin(a),-1+2.22*math.cos(a)*math.sin(j*math.tau/segs)))
    fs=[(row*segs+j,row*segs+(j+1)%segs,(row+1)*segs+(j+1)%segs,(row+1)*segs+j)for row in range(rings)for j in range(segs)]
    b.mesh('white-dome',vs,[tuple(reversed(f))for f in fs],'white',True,'south square dome',True)
    for x in [28,35,42]:
        b.box('work-counter-'+str(x),(x,.76,-5.5),(5.6,.1,.72),'oak')
        for dx in [-2,2]:b.box(f'counter-foot-{x}-{dx}',(x+dx,.35,-5.5),(.10,.70,.60),'graphite')
        for j in range(4):
            sx=x+(j-1.5)*1.2;b.box(f'work-stool-{x}-{j}',(sx,.44,-4.55),(.43,.07,.43),'oak');b.cylinder(f'stool-stem-{x}-{j}',(sx,.22,-4.55),.035,.40,'steel',segments=10)
            b.box(f'power-outlet-{x}-{j}',(sx,.85,-5.72),(.11,.065,.055),'white',False)
    b.rail('south-edge',(-59,0,-7.5),(59,0,-7.5))
    b.sign('identity',(23,2.3,-6.8),4.8,.8,'みんなの広場','WOOD SQUARE · 4F',accent='#bdd095')
    b.route('walk',[(-69,0,3),(-63,0,3),(-30,0,5),(10,0,5),(40,0,3),(58,0,0)])
    b.route('south-stair',[(-74.45,15.5-y4,-7.2),(-74.45,15.5-y4,-6.54088),(-74.45,17.987109077-y4,-2.34476),(-74.45,17.987109077-y4,-.74436),(-74.45,0,1.95123),(-74.45,0,3),(-69,0,3),(-63,0,3)])
    b.view('turf',(-22,1.7,5),(10,1,-2),PHOTO+'img_southsquare_01.jpg',['south atrium edge 4F','turf and timber forms','dome at eastern turf edge'])
    b.view('work',(47,1.7,2),(20,1.2,-4),PHOTO+'img_southsquare_02.jpg',['south-facing work counters','power outlets','open circulation north of furniture'])


def facade(b):
    b.zone('facade')
    # Bounded southern bay family: small square recesses on the opaque upper
    # stone fields, retained large windows, varied end transitions. Applied in
    # front of solid wall faces; recesses are real reveal boxes, not black decals.
    for bay in range(8):
        x=-44+bay*13.0
        for row in range(3):
            for col in range(4):
                px=x+(col-1.5)*1.18;py=38.8+row*1.25
                b.box(f'recess-back-{bay}-{row}-{col}',(px,py,-21.10),(.74,.74,.04),'dark-stone')
                for side in [-1,1]:
                    b.box(f'recess-side-{bay}-{row}-{col}-{side}',(px+side*.415,py,-20.91),(.09,.92,.42),'ivory')
                    b.box(f'recess-cap-{bay}-{row}-{col}-{side}',(px,py+side*.415,-20.91),(.74,.09,.42),'ivory')
        if bay%2==0:
            b.box('projected-bay-'+str(bay),(x,31.9,-20.81),(7.8,1.15,.75),'ivory')
            for j in range(10):b.box(f'service-grille-{bay}-{j}',(x-3.2+j*.70,31.91,-20.41),(.04,.72,.04),'steel',False)
    # Thin reveals follow existing west-south doorway yaw and elevations.
    for r in list(b.layout['boxes']):
        if r['id'].startswith('west-south-') and r['id'].endswith('head'):
            c=r['center'];s=r['size'];old=(b.prefix,b.origin,b.yaw)
            b.zone('west-reveal',(c['x'],c['y'],c['z']),r.get('yaw',0))
            b.box(r['id']+'-drip',(0,s['y']/2+.02,.04),(s['x']+.10,.04,.17),'steel',False)
            b.prefix,b.origin,b.yaw=old
    b.view('long-west',(-68,21.3,0),(30,35,-21),'https://www.kanebako-se.co.jp/media/5/9/0/590_800x600.jpg',['retained south bays','upper small square arrays','projecting band below'])
    b.view('long-east',(59,21.3,0),(-43,35,-21),'https://www.kanebako-se.co.jp/media/5/9/0/590_800x600.jpg',['east end transition','same facade family reverse','canopy connection unchanged'])


def build(b):
    passage(b);west_square(b);theater(b);promenade_and_wood(b);facade(b)
