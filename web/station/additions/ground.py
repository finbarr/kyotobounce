"""K038–42, K035 and the 1F portion of K053. Public-plan relationships.

North retail is east of the open central arrival axis; retained north lattice
columns and escalator mouths are registration anchors. Tenant interiors are
original, human-scale interpretations, not surveyed shop-fit drawings.
"""
import math

MAP='https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/floorguide/img/map/img_map_1f.svg'


def shop(b,name,origin,yaw,width,depth,ja,en,kind='shop',color='#e8d6b1',door=2.25):
    b.zone(name,origin,yaw);h=3.35
    b.box('floor',(0,-.084,depth/2),(width,.18,depth),'ivory',role='shop floor')
    b.box('rear',(0,h/2,depth),(width,h,.16),'ivory')
    b.box('ceiling',(0,h+.08,depth/2),(width,.16,depth),'ivory')
    for side in [-1,1]:
        b.box(f'side-{side}',(side*width/2,h/2,depth/2),(.16,h,depth),'ivory')
        pane=(width-door)/2
        b.box(f'window-{side}',(side*(door/2+pane/2),1.23,0),(pane,2.46,.024),'glass')
        b.box(f'jamb-{side}',(side*(door/2+.035),1.25,-.018),(.07,2.50,.10),'steel')
        for y in [.05,2.46]:b.box(f'transom-{side}-{y}',(side*(door/2+pane/2),y,-.024),(pane,.05,.08),'steel')
        b.box(f'window-stripe-{side}',(side*(door/2+pane/2),1.03,-.026),(pane-.04,.12,.008),'white',False)
    b.box('header',(0,2.90,0),(width,.90,.22),'graphite')
    b.sign('identity',(0,2.94,-.14),width-.18,.70,ja,en,kind,'south',color)
    b.box('door-track',(0,2.51,-.03),(door,.07,.11),'steel')
    for u in [-width*.31,width*.31]:
        for v in [depth*.25,depth*.72]:b.box(f'light-{u}-{v}',(u,3.29,v),(.22,.06,1.5),'light',False)
    b.light('ceiling-light',(0,3.2,depth*.45))
    b.route('entry',[(0,0,-2),(0,0,1.5),(0,0,min(2.4,depth-1.5))])


def product_shelf(b,name,x,z,width=2.5,rows=4):
    b.box(name+'-back',(x,1.05,z+.25),(width,2.1,.06),'white')
    for row in range(rows):
        y=.3+row*.42
        b.box(f'{name}-deck-{row}',(x,y,z),(width,.035,.53),'steel')
        for col in range(int(width/.19)):
            u=x-width/2+.15+col*.19;mat=['green','red','orange','blue','white'][col%5]
            if row%2==0:
                b.cylinder(f'{name}-can-{row}-{col}',(u,y+.14,z-.08),.055,.24,mat,False,12)
                b.cylinder(f'{name}-cap-{row}-{col}',(u,y+.265,z-.08),.035,.025,'white',False,12)
            else:
                b.box(f'{name}-pack-{row}-{col}',(u,y+.13,z-.10),(.13,.23,.14),mat,False)
                b.box(f'{name}-label-{row}-{col}',(u,y+.13,z-.173),(.11,.05,.004),'white',False)
        # Native shelf decks and end panels bound the stock, rather than an
        # invisible wall spanning the aisle. Tiny printed packaging is cosmetic.
        b.label(f'{name}-prices-{row}',(x,y,z-.272),width-.05,.08,'', '¥180   ¥210   ¥160   ¥240',face='south')
    for side in [-1,1]:b.box(name+f'-end-{side}',(x+side*width/2,1.05,z),(.04,2.1,.55),'ivory')


def retail(b):
    shop(b,'heart1f',(25.5,0,13.4),0,10.6,6.6,'7-ELEVEN','Heart-in · 京都駅中央口','heartin')
    # Start beside the physical tactile strip, then cross it into the doorway.
    b.routes[-1]['points'][0]['x']+=.6
    for i,mat in enumerate(['red','green','orange']):b.box('band-'+mat,(0,2.48+i*.11,-.151),(10.55,.085,.026),mat,False)
    product_shelf(b,'cold',0,6.12,6.6)
    for x in [-3.4,3.4]:product_shelf(b,'gondola-'+str(x),x,3.7,2.5,3)
    b.box('checkout',(3.5,.51,1.22),(2.1,1.02,.78),'oak')
    b.box('counter',(3.5,1.065,1.22),(2.2,.07,.87),'white')
    b.box('register',(3.4,1.35,1.40),(.43,.30,.10),'graphite')
    b.label('register-screen',(3.4,1.35,1.344),.38,.25,'いらっしゃいませ','WELCOME',face='south')
    b.box('coffee-machine',(4.2,1.42,1.35),(.42,.64,.42),'graphite')
    b.sign('cold-sign',(0,2.5,6.0),5.8,.35,'飲料・おにぎり・お弁当','CHILLED · DRINKS · LUNCH',face='south',accent='#76bc85')
    b.view('hall',(-11,1.7,-8),(0,1.4,1),MAP,['north lattice column row z=12.428','central entrance axis x=0','east escalator approach x=32'])
    b.view('forecourt',(9,1.7,10),(0,1.4,3),MAP,['north shop rear glazing','east return','entry fascia seen obliquely'])
    # Rear window to the forecourt, with actual visible shop depth.
    b.remove(lambda n:n=='add-heart1f-rear')
    b.box('rear-sill',(0,.30,6.6),(10.6,.60,.16),'stone')
    b.box('rear-window',(0,1.90,6.6),(10.6,2.6,.026),'glass')
    for x in [-5.2,-2.6,0,2.6,5.2]:b.box('rear-mullion-'+str(x),(x,1.9,6.62),(.05,2.6,.08),'steel')
    b.sign('forecourt-identity',(0,2.91,6.66),7,.55,'7-ELEVEN','Heart-in · Central Gate','heartin')

    shop(b,'travel1f',(15.5,0,13.4),0,8.8,5.5,'日本旅行・外貨両替','TRAVEL · CURRENCY EXCHANGE',color='#84aebf')
    b.box('service-counter',(0,1.03,3.7),(7.2,1.06,.85),'white')
    for i,x in enumerate([-2.5,0,2.5]):
        b.box(f'partition-{i}',(x,1.52,3.97),(.07,.96,.7),'frosted')
        b.box(f'screen-{i}',(x,1.76,3.67),(.58,.37,.06),'graphite')
        b.sign(f'travel-poster-{i}',(x,1.90,5.39),1.38,1.7,'日本の旅','DISCOVER JAPAN','poster','south',index=i+1)
    shop(b,'yojiya1f',(7.75,0,13.4),0,5.9,4.9,'よーじや','YOJIYA · KYOTO',color='#bd554b')
    for x in [-1.7,1.7]:
        b.box('display-'+str(x),(x,.50,2.5),(1.0,1,1.15),'oak')
        for i in range(4):b.box(f'gift-{x}-{i}',(x-.32+i*.21,1.09,2.5),(.17,.17,.21),'white',False)
    product_shelf(b,'cosmetics',0,4.38,4.3,3)
    b.sign('store-mark',(0,2.47,4.78),1.2,.68,'よーじや','京都',face='south',accent='#c8574b')
    b.view('retail-order',(-8,1.7,-6),(7,1.6,1),MAP,['Yojiya west of travel exchange','Heart-in eastern anchor','retained lattice column row'])
    b.view('retail-return',(15,1.7,-5),(0,1.5,1),MAP,['three distinct northern frontages','original counters','central arrival axis'])


def ceiling_bay(b,name,x,y,z,width=9,length=6):
    b.box(name+'-soffit',(x,y+.09,z),(width,.18,length),'graphite')
    for i in [-1,1]:
        b.box(name+f'-light-band-{i}',(x+i*width*.34,y-.013,z),(.85,.025,length-.08),'ivory',False)
        for j in [-1,0,1]:
            b.cylinder(name+f'-round-light-{i}-{j}',(x+i*width*.34,y-.035,z+j*length*.30),.32,.026,'light',False,32)
    for side in [-1,1]:
        for j in range(6):b.box(name+f'-grille-{side}-{j}',(x+side*(width*.43+j*.026),y-.02,z),(.012,.028,length-.16),'steel',False)
    for dx in [-width*.5,width*.5]:
        for band in range(int((y-1)/.64)):
            b.box(name+f'-column-{dx}-{band}',(x+dx,band*.64+.32,z),(1.04,.632,1.04),'dark-stone'if band%3!=2 else'ivory')
    for dx in [-width*.5,width*.5]:b.box(name+f'-column-cap-{dx}',(x+dx,(y+int((y-1)/.64)*.64)/2,z),(1.04,y-int((y-1)/.64)*.64,1.04),'stone')


def entrances(b):
    # A real stair opening, cut from the single original concourse mesh. Keep
    # its surface ID for existing targets and use the same mesh for native rays.
    import bpy
    old=bpy.data.objects['concourse'];material=old.data.materials[0]
    physical=next(r['material']for r in b.layout['panels']if r['id']=='concourse')
    b.remove(lambda n:n=='concourse');b.zone('porta')
    pieces=[((-61,-.3,-6),(48,.6,70)),((47,-.3,-6),(156,.6,70)),((-34,-.3,-10.5),(6,.6,61))]
    vertices=[];faces=[]
    from geometry import FACES
    for c,s in pieces:
        offset=len(vertices);vertices += [tuple(c[i]+d[i]*s[i]/2 for i in range(3))for d in [(x,y,z)for x in [-1,1]for y in [-1,1]for z in [-1,1]]];faces += [tuple(offset+i for i in f)for f in FACES]
    b.materials['original-concourse']=material
    floor=b.mesh('concourse-recut',vertices,faces,'original-concourse',False,'floor');floor.name='concourse';floor['kyoto_surface']='concourse';floor['kyoto_collision']=True;floor['kyoto_physical']=physical;b.panel_record(floor,'floor')
    b.stairs('north-entry',(-34,0,20),(-34,-4.14,27.6),5.8)
    b.box('lower-landing',(-34,-4.26,30.3),(6,.24,5.4),'ivory',role='Porta lower landing')
    b.box('stair-well-west',(-37.05,-1.8,25.5),(.15,5.6,11),'stone')
    b.box('stair-well-east',(-30.95,-1.8,24.1),(.15,5.6,8.2),'stone')
    b.box('basement-floor',(-24,-4.27,31),(14,.26,4),'ivory',role='Porta concourse')
    b.box('basement-rear',(-27,-2.27,33.1),(20,3.74,.18),'ivory')
    b.box('basement-ceiling',(-27,-.43,31),(20,.20,4.2),'ivory')
    b.box('basement-north',(-23.95,-2.27,28.92),(13.9,3.74,.16),'ivory')
    b.box('basement-east',(-17,-2.27,31),(.16,3.74,4.2),'ivory')
    b.box('basement-west',(-37.05,-2.27,32.05),(.15,3.74,2.1),'ivory')
    b.sign('basement-directory',(-17.10,-2.2,31),2.3,1.4,'Porta','SHOPPING · DINING','directory',face='west',accent='#d77399')
    for x in [-31,-25,-19]:b.box('basement-light-'+str(x),(x,-.66,31),(1.8,.06,.4),'light',False)
    b.sign('entry-sign',(-34,2.8,20.1),5.8,.7,'Porta','京都ポルタ · B1F',face='south',accent='#d77399')
    for x in [-37,-31]:b.box('entry-post-'+str(x),(x,1.4,20.1),(.14,2.8,.18),'steel')
    b.sign('bottom-sign',(-33,-1.5,32.96),4,.6,'Porta','SHOPPING · DINING',face='south',accent='#d77399')
    b.route('down',[(-34,0,18),(-34,0,20),(-34,-4.14,27.6),(-34,-4.14,31),(-23,-4.14,31)])
    b.view('mouth',(-34,1.7,15.5),(-34,-1,25),MAP,['west forecourt','north-facing descent','hall link outside west escalator'])
    b.view('landing',(-26,-2.5,31),(-34,-2,25),MAP,['lower public landing','stair return','Porta signage'])
    # Department-store entry at the western ground-level edge, not the cafe.
    shop(b,'isetan1f',(-73.2,0,-7),-90,7.2,4.4,'JR 京都伊勢丹','JR KYOTO ISETAN',color='#eef1eb')
    b.box('inner-doors',(0,1.3,3.5),(5.4,2.6,.026),'glass')
    for x in [-1.4,1.4]:b.box('door-handle-'+str(x),(x,1.25,3.41),(.035,.55,.065),'steel')
    for x in [-2.1,2.1]:b.box('display-case-'+str(x),(x,.55,2.3),(.6,1.1,.8),'oak')
    b.view('arrival',(-4,1.7,-5),(0,1.6,1),MAP,['western hall edge','department store portal','inner glazed doors'])
    b.view('inside',(1,1.7,2.4),(0,1.6,-3),MAP,['public hall threshold','entry display cases','retained western building'])


def central_gate(b):
    b.remove(lambda n:n=='south-concourse-hall-rear-boundary-rear')
    b.zone('central-gate')
    b.box('paid-floor',(8.5,-.18,-37.0),(33,.36,15),'stone',role='station paid concourse')
    b.box('rear-depth',(8.5,3.1,-44.5),(33,6.2,.20),'ivory')
    b.box('paid-ceiling',(8.5,5.6,-37),(33,.20,15),'ivory')
    for x in [-8,25]:b.box('return-'+str(x),(x,2.8,-37),(.18,5.6,15),'stone')
    for i,x in enumerate([-3,3,9,15,21]):
        b.box('column-'+str(i),(x,2.8,-39),(.7,5.6,.7),'dark-stone')
        b.box('strip-'+str(i),(x,5.45,-36),(.4,.06,8),'light',False)
        b.sign('platform-'+str(i),(x,3.9,-42.9),4.3,.85,'のりば '+str(i+1),'JR LINES · PLATFORMS',accent=['#478ccc','#66a756','#b39256'][i%3])
    # Preserve the existing closed ticket-gate flaps. Depth is visible through
    # their gaps but the paid boundary is not an unmarked playable doorway.
    for i,x in enumerate([3.1,5.8,8.5,11.2,13.9]):
        b.label('departure-'+str(i),(x,4.8,-26.96),2.4,.78,'発車ご案内','DEPARTURES','departures',index=i)
    b.sign('public-boundary',(16.8,1.4,-27.12),1.15,.48,'改札口','TICKET GATES',accent='#73aa85')
    for x in [-4.75,21.75]:
        b.box('office-rear-'+str(x),(x,1.9,-31.8),(6.4,3.8,.12),'ivory')
        b.box('office-light-'+str(x),(x,3.55,-30),(4.8,.06,.3),'light',False)
    b.view('arrival',(8.5,1.7,-17),(8.5,2.7,-35),MAP,['gate line z=-27.4','two service offices','retained curved balcony'])
    b.view('oblique',(-6,1.7,-19),(12,2,-34),MAP,['ticket flaps','columns behind gate','ticket-office east frontage'])
    b.zone('hall-soffit')
    for x in [-48,-39,-30]:ceiling_bay(b,'bay-'+str(x),x,5.95,-10,9,6)
    b.view('approach',(-40,1.7,-2),(-39,3.8,-10),MAP,['covered western hall','banded columns','round lamps and longitudinal grilles'])
    b.view('reverse',(-39,1.7,-13),(-40,4,-5),MAP,['same soffit bay reverse','column capitals','bounded ceiling lighting'])


def east(b):
    # The east floor map specifies one Osake frontage then one larger 7 Taps
    # restaurant. Retain the structural bays, replace four equal shop identities.
    b.layout['concourseDetails']['labels']=[r for r in b.layout['concourseDetails']['labels']if not r['id'].startswith(('concourse-shop-header','concourse-shop-menu','concourse-window-hours','concourse-inside-menu'))]
    b.zone('east1f')
    b.sign('osake',(34.35,2.54,-1.81),3.5,.35,'お酒の美術館','OSAKE MUSEUM',accent='#d9b464')
    b.sign('7taps',(43.87,2.56,-1.81),11.9,.39,'7 TAPS TAVERN','PUB & GRILL',accent='#d5cbae')
    b.sign('osake-menu',(32.75,1.17,-1.8),.42,.8,'本日のおすすめ','WHISKY · HIGHBALL','menu')
    b.sign('7taps-menu',(41.5,1.25,-1.8),.70,1.1,'京都のクラフトビール','CRAFT BEER · GRILL','menu')
    # Service route follows the existing east passage. Extend the hotel side
    # north of the shop returns, leaving its 2.8m passage open.
    b.box('hotel-porte-cochere',(58,4.5,15),(20,.22,10),'ivory')
    for x in [49,67]:b.cylinder('hotel-column-'+str(x),(x,2.25,19),.42,4.5,'stone')
    b.box('hotel-drive',(59,-.054,18),(20,.12,11),'dark-stone',False)
    b.sign('hotel-entry',(58,3.0,8.64),6.8,.75,'ホテルグランヴィア京都','HOTEL GRANVIA KYOTO',accent='#d5b98c')
    b.box('hotel-vestibule-back',(58,1.9,5.1),(5.2,3.8,.12),'oak')
    b.box('hotel-vestibule-glass',(58,1.65,8.67),(4.8,3.3,.028),'glass')
    for x in [55.7,58,60.3]:b.box('hotel-frame-'+str(x),(x,1.65,8.69),(.045,3.3,.05),'steel')
    b.box('police-booth',(66,1.55,5.0),(4,3.1,4.2),'ivory')
    b.box('police-window',(65.4,1.6,7.12),(1.9,1.25,.025),'glass')
    b.sign('police',(66,2.65,7.17),3.6,.48,'京都駅前交番','POLICE',accent='#91b0c1')
    for i in range(6):
        x=47.3+i*.53;b.box('locker-'+str(i),(x,.98,3.76),(.50,1.96,.58),'steel')
        for row in range(3):b.label(f'locker-face-{i}-{row}',(x,.34+row*.63,4.058),.48,.6,'',str(401+i*3+row),'locker',index=i)
    b.sign('lockers',(48.62,2.25,4.02),3.1,.33,'コインロッカー','COIN LOCKERS',accent='#94b5c6')
    b.box('lift-portal',(52.5,1.7,7.1),(2.4,3.4,.18),'ivory')
    b.box('lift-doors',(52.5,1.3,7.21),(1.8,2.6,.06),'steel')
    b.box('lift-split',(52.5,1.3,7.245),(.012,2.6,.005),'graphite',False)
    b.sign('lift-sign',(52.5,2.94,7.22),1.8,.39,'エレベーター','2F · HOTEL',accent='#b1c4c1')
    for x in [49,52,64,67]:b.cylinder('bollard-'+str(x),(x,.43,21),.065,.86,'steel')
    b.view('retail',(35,1.7,2.5),(43,1.6,-3),MAP,['east-frontage bay mullions','Osake western end','7 Taps contiguous frontage'])
    b.view('retail-return',(48,1.7,.1),(37,1.6,-2.5),MAP,['contiguous restaurant glazing','western Osake frontage','public east passage'])
    b.view('hotel',(42,1.7,16),(59,2,9),MAP,['hotel drop-off edge','east passage','separate lift and police frontage'])


def tactile(b,name,a,c):
    # Physically raised 4.5mm ribs; parallel to the direction of travel.
    dx,dz=c[0]-a[0],c[2]-a[2];length=math.hypot(dx,dz)
    if length<.01:return
    yaw=math.degrees(math.atan2(dx,dz));old=(b.prefix,b.origin,b.yaw)
    b.zone(name,a,yaw)
    b.box('base',(0,.001,length/2),(.30,.002,length),'yellow',False)
    for i in range(4):b.box('rib-'+str(i),((i-1.5)*.064,.00325,length/2),(.023,.0045,length),'yellow',role='tactile guidance ribs')
    b.prefix,b.origin,b.yaw=old


def tactile_junction(b,name,c):
    old=(b.prefix,b.origin,b.yaw);b.zone(name,c)
    b.box('pad',(0,.001,0),(.4,.002,.4),'yellow',False)
    for i in range(4):
        for j in range(4):b.cylinder(f'bump-{i}-{j}',((i-1.5)*.08,.0035,(j-1.5)*.08),.014,.005,'yellow',True,12)
    b.prefix,b.origin,b.yaw=old


def build(b):
    retail(b);entrances(b);central_gate(b);east(b)
    for i,(a,c)in enumerate([(-2,15.8),(16.2,25.3),(25.7,30)]):tactile(b,'1f-tactile-north-'+str(i),(a,0,10),(c,0,10))
    tactile(b,'1f-tactile-heart',(25.5,0,10.2),(25.5,0,13.0))
    tactile(b,'1f-tactile-travel',(16,0,10.2),(16,0,13.0))
    for i,x in enumerate([16,25.5]):tactile_junction(b,'1f-tactile-junction-'+str(i),(x,0,10))
