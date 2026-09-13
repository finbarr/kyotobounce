"""K036, K048–52: upper public destinations and north forecourt."""
import math, random
from ground import shop

PHOTO='https://www.kyoto-station-building.co.jp/app/themes/kyoto-station-building/service/square/img/'


def foliage(b,name,c,width,depth,height,seed=1):
    rng=random.Random(seed);leaves=[([],[])for _ in range(3)]
    for stem in range(38):
        x=c[0]+rng.uniform(-width/2,width/2);z=c[2]+rng.uniform(-depth/2,depth/2);h=height*rng.uniform(.65,1.10)
        b.rod(f'{name}-culm-{stem}',(x,c[1],z),(x+.12,c[1]+h,z+.09),.018,'leaf-light',False,6)
        for j in range(18):
            y=c[1]+h*(.32+j/27);angle=rng.random()*math.tau;reach=rng.uniform(.16,.53)
            p=(x+reach*math.cos(angle),y,z+reach*math.sin(angle));v,f=leaves[j%3]
            for k in range(5):
                a=angle+(k-2)*.55;length=rng.uniform(.10,.26);spread=.027;start=len(v)
                v.extend([p,(p[0]+math.cos(a)*length*.45-math.sin(a)*spread,p[1]+.014,p[2]+math.sin(a)*length*.45+math.cos(a)*spread),(p[0]+math.cos(a)*length,p[1]-.075,p[2]+math.sin(a)*length),(p[0]+math.cos(a)*length*.45+math.sin(a)*spread,p[1]-.012,p[2]+math.sin(a)*length*.45-math.cos(a)*spread)])
                f.extend([(start,start+1,start+2),(start,start+2,start+3),(start+2,start+1,start),(start+3,start+2,start)])
    for i,(v,f)in enumerate(leaves):b.mesh(f'{name}-leaves-{i}',v,f,['leaf','leaf-light','leaf-dark'][i],False,'bamboo foliage')


def garden(b):
    b.zone('garden');y=54.4982456
    import bpy
    for key in ['boxes','panels']:
        for record in b.layout[key]:
            if record.get('appearance')=='garden-garden-pale-paving':
                record['appearance']='station-additions-garden-paving'
                obj=bpy.data.objects.get(record['id'])
                if obj:obj.data.materials.clear();obj.data.materials.append(b.materials['garden-paving'])
    # Densify the four existing bamboo beds; do not put trunks on walkways.
    for i,(x,z,w,d)in enumerate([(-165,-28,2.3,2.3),(-145,-28,2.3,2.3),(-165,-14.85,2.2,1.0),(-145,-12.6,2.2,1.2)]):
        foliage(b,'bamboo-'+str(i),(x,y+.36,z),w,d,3.6,i+31)
    # A low perimeter planting ribbon stays within the existing garden deck.
    for i in range(18):
        z=-31.8+i*1.1
        b.box('west-bed-'+str(i),(-167.3,y+.24,z),(.72,.48,1.08),'yellow')
        # Geometry leaves are grouped by material to avoid per-leaf draw calls.
        rng=random.Random(200+i);vs=[];fs=[]
        for j in range(50):
            x=-167.3+rng.uniform(-.3,.3);pz=z+rng.uniform(-.48,.48);h=rng.uniform(.18,.52);start=len(vs)
            vs.extend([(x-.09,y+.48,pz),(x,y+.48+h,pz+.04),(x+.12,y+.48,pz),(x,y+.48,pz-.09)])
            fs.extend([(start,start+1,start+2),(start+2,start+1,start),(start+3,start+1,start+2),(start+2,start+1,start+3)])
        b.mesh('groundcover-'+str(i),vs,fs,'leaf-dark',False)
    for i,z in enumerate([-24,-20,-16]):b.bench('edge-bench-'+str(i),-164.9,y,z,2.2)
    b.box('west-drain',(-167.9,y+.007,-22),(.15,.014,22),'steel',False)
    for i,x in enumerate([-166.5,-161,-150,-143]):
        b.box('screen-post-'+str(i),(x,y+1.35,-33.25),(.10,2.70,.10),'yellow')
    # Screen rails run along the existing southern boundary, clear of stairs.
    for x0,x1 in [(-167,-158),(-154,-142)]:
        for j in range(7):b.box(f'screen-{x0}-{j}',((x0+x1)/2,y+.28+j*.35,-33.25),(x1-x0,.065,.065),'yellow')
    b.sign('arrival',(-149,y+1.8,-31.6),2.8,.62,'大空広場','SKY GARDEN · 葉っぴいてらす',accent='#b2ca82')
    b.route('edge-walk',[(-156,y,-22),(-159,y,-22),(-162,y,-22),(-162,y,-17),(-155,y,-17),(-148,y,-19)])
    b.view('arrival',(-156,y+1.7,-20.4),(-146,y+1,-18),PHOTO+'img_oozorahiroba_01.jpg',['retained bamboo beds','yellow lamp shelters','garden stair gap'])
    b.view('edge',(-159,y+1.7,-30),(-164,y+1,-17),PHOTO+'img_oozorahiroba_01.jpg',['west screen and bed','walkable paving','south stair approach'])
    for cam in b.layout['inspectionCameras']:
        if cam['id']=='inspect-roof-photo-2021':
            cam.update(position=dict(x=-156,y=y+1.7,z=-20.4),target=dict(x=-146,y=y+1,z=-18),status='Current roof garden diagnostic view; operator-photo features registered, metric camera not surveyed')


def east_square(b):
    b.zone('eastsquare');y=34.62
    # The reference's yellow perforated service volume sits behind the globe
    # gazebo, away from the access ramp, tree seating, piano and model exhibit.
    x,z=99.1,-.35;w,h=4.7,3.9
    b.box('yellow-volume-back',(x,y+h/2,z+1.05),(w,h,.16),'yellow')
    b.box('yellow-volume-roof',(x,y+h,z+.45),(w,.12,1.3),'yellow')
    for side in [-1,1]:b.box('yellow-return-'+str(side),(x+side*w/2,y+h/2,z+.45),(.10,h,1.3),'yellow')
    # True perforations: shared narrow strips surrounding open square holes.
    for col in range(24):b.box('perforated-u-'+str(col),(x-w/2+col*w/23,y+h/2,z-.21),(.042,h,.045),'yellow')
    for row in range(21):b.box('perforated-v-'+str(row),(x,y+row*h/20,z-.21),(w,.042,.045),'yellow')
    for i,(px,pz)in enumerate([(98,-14),(101,-14),(104,-14),(108,-14),(108,-10),(108,-5),(106,-1)]):
        b.cylinder('floor-light-rim-'+str(i),(px,y+.011,pz),.11,.022,'steel',False,20)
        b.cylinder('floor-light-lens-'+str(i),(px,y+.024,pz),.077,.008,'light',False,20)
    # Pale base of the eastern facade; placed beyond the retained planters so
    # the square keeps its full walking area and existing height connections.
    for i in range(10):
        pz=-13.5+i*2
        b.box('facade-base-'+str(i),(112.59,y+.37,pz),(.11,.74,1.98),'ivory')
        b.box('base-joint-'+str(i),(112.52,y+.37,pz+.99),(.009,.70,.014),'stone',False)
    b.view('gazebo',(96,y+1.7,-9),(103,y+1.8,-2),PHOTO+'img_eastsquare_01.jpg',['existing globe gazebo','existing staked tree','yellow perforated volume behind gazebo'])
    b.view('reverse',(110,y+1.7,-2),(100,y+1,-10),PHOTO+'img_eastsquare_03.jpg',['seating and floor lights','open middle of square','retained ramp connection'])
    b.route('open-square',[(99,y,-15),(100,y,-13.8),(109,y,-13.8),(109,y,-5)])
    # NIWA is at the southern East Square opening on the current 7F map.
    # Remove the old closed entrance leaves, retaining its curved canopy.
    b.remove(lambda n:n.startswith('east-court-south-door')and'jamb'not in n)
    b.doorway('east-court-south-entry-backing',106.8,109.4,34.62,37.3)
    shop(b,'niwa',(108.1,y,-18.03),180,7.8,6.0,'NIWA','ART TERRACE LOUNGE',color='#d8c58d')
    for x in [-2.35,2.35]:b.table('table-'+str(x),x,0,3.5)
    b.box('tea-counter',(0,.53,5.3),(6,1.06,.75),'oak')
    b.sign('tea-menu',(0,2.23,5.90),4.6,.9,'抹茶・和菓子','MATCHA · KYOTO SWEETS','menu',face='south')
    # Light tea-room silhouette, original lattice, visible behind the counter.
    for i in range(13):b.box('tea-screen-'+str(i),(-2.7+i*.45,2,5.65),(.035,2.0,.035),'oak',False)
    b.sign('entry-menu',(-2.7,1.5,-.18),.7,1.1,'NIWA','MATCHA · SWEETS','menu',face='south')
    b.sign('public-identity',(0,2.96,-.9),3.4,.5,'NIWA','ART TERRACE LOUNGE','brand',face='south',accent='#d8c58d')
    b.view('arrival',(2.1,1.7,-6),(0,1.5,1),'https://www.kyoto-station-building.co.jp/restaurant_cafe/004/',['south opening of East Square','retained curved canopy','separate eastern hotel glazing'])
    b.view('interior',(2,1.7,3),(-1,1.5,-3),'https://niwa.naked.works/kyoto/jp/',['terrace-facing entry','tea counter','timber lattice'])


def upper_retail(b):
    # Existing 8F/9F south doorway transforms connect to the Grand Staircase.
    doors=[('fukunaga',8,36.7789473684,-117.96,-26.36,'FUKUNAGA901','PARFAIT · CAFE'),('kato',9,40.9894736842,-129.235,-29.10,'KATO','京都駅店 · RAILWAY MODELS')]
    for name,floor,y,x,z,ja,en in doors:
        # Preserve the historic structural portal frame; replace closed door
        # panes in the actual mapped arrival, not an arbitrary repeated bay.
        b.remove(lambda n,f=floor:n.startswith(f'west-south-{f}f-')and('door-leaf' in n or'meeting-stile' in n))
        shop(b,name,(x,y,z),166.36265401221328,7.5,5.7,ja,en,color='#eedbc3'if floor==8 else'#94b6bf',door=1.68)
        b.remove(lambda n:n=='add-'+name+'-identity')
        # Existing upper-floor facade covers the broad shopfront. Mount a
        # compact tenant plaque on the public face of the retained portal.
        b.sign('portal-identity',(0,2.91,-.48),3.3,.60,ja,en,'brand',face='south',accent='#eedbc3'if floor==8 else'#94b6bf')
        if floor==8:
            for px in [-2.3,2.3]:b.table('cafe-'+str(px),px,0,3.3)
            b.box('pastry-case',(0,.65,5.0),(4.8,1.3,.72),'glass')
            for i in range(9):
                px=-1.8+i*.45;b.cylinder('parfait-glass-'+str(i),(px,1.07,4.88),.08,.23,'glass',False,16);b.cylinder('fruit-'+str(i),(px,1.23,4.88),.10,.10,'red'if i%2 else'leaf-light',False,12)
        else:
            b.box('model-counter',(0,.55,3.7),(4.5,1.1,1.9),'oak')
            b.box('layout-cover',(0,1.35,3.7),(4.5,.5,1.9),'glass')
            for rail in [-.38,.38]:
                b.box('track-'+str(rail),(0,1.113,3.7+rail),(4.2,.014,.04),'steel',False)
                for i in range(5):
                    px=-1.6+i*.66;b.box(f'train-{rail}-{i}',(px,1.23,3.7+rail),(.58,.20,.16),'ivory',False);b.box(f'train-stripe-{rail}-{i}',(px,1.24,3.7+rail-.086),(.56,.045,.008),'blue',False)
            for row in range(5):b.box('model-shelf-'+str(row),(0,.35+row*.42,5.4),(6,.045,.32),'white')
        reference='https://www.fukunaga294.jp/location.html'if floor==8 else'https://www.katomodels-kyoto.com/storeinfo'
        b.view('entry',(-3,1.7,-4),(0,1.5,2),reference,[f'{floor}F south Grand Staircase landing','existing doorway frame','interior counter'])
        b.view('reverse',(2,1.7,3),(0,1.7,-3),reference,['open threshold','south wing floor','retained stair approach'])
    b.zone('ramen10f',(-105,45.2,-24.8))
    b.sign('arrival',(0,3.15,0),7.0,.8,'京都拉麺小路','KYOTO RAMEN KOJI',accent='#d58959')
    for x in [-3.6,3.6]:b.box('portal-'+str(x),(x,1.75,0),(.20,3.5,.45),'oak')
    for i in range(11):b.box('noren-'+str(i),((i-5)*.52,2.4,-.12),(.48,.7,.02),'red',False)
    b.sign('directory',(4.5,1.8,-.15),1.2,2,'京都拉麺小路','RAMEN DIRECTORY','directory')
    b.view('arrival',(-3,1.7,5),(0,2,-4),'https://www.kyoto-station-building.co.jp/floorguide/',['10F Grand Staircase south arrival','Ramen Koji portal','noren and directory'])
    b.view('inside',(-7,1.7,-7),(0,2,0),'https://www.kyoto-station-building.co.jp/floorguide/',['south wing dining floor','counter silhouettes','portal reverse'])
    for i,(x,z)in enumerate([(-116,-33),(-133,-36),(-97,-38)]):
        b.zone('ramen-interior-'+str(i),(x,45.2,z))
        b.box('counter',(0,.51,0),(5,1.02,.65),'oak')
        for j in range(6):
            sx=(j-2.5)*.70;b.cylinder('stool-'+str(j),(sx,.6,1),.19,.07,'red');b.cylinder('stool-leg-'+str(j),(sx,.28,1),.035,.55,'steel',segments=10)
        b.sign('shop-front',(0,2.6,-.1),4.8,.65,'らーめん','RAMEN · 京都',accent='#eac7a1')


def skyway(b):
    b.zone('skyway');floor=45.2;zs=[1.046107,3.606107]
    for i in range(58):
        x=-76.4+i*2.44
        # South lower panels are translucent/opaque in the architect's interior
        # view; keep the north-facing Kyoto Tower windows clear above the rail.
        b.box('opaque-base-'+str(i),(x,floor+.43,zs[0]+.025),(2.40,.72,.026),'frosted')
        b.box('skirting-'+str(i),(x,floor+.085,zs[0]+.051),(2.40,.17,.04),'steel')
        for z in zs:
            b.rod(f'rail-bracket-{i}-{z}',(x,floor+1.0,z),(x,floor+1.06,z+(.11 if z==zs[0]else-.11)),.016)
        if i%2==0:
            b.rod('roof-tie-'+str(i),(x,47.88,zs[0]),(x,47.88,zs[1]),.034)
            b.box('ceiling-light-'+str(i),(x,47.83,2.326),(.75,.035,.12),'light',False)
    for x in [-76,65.8]:
        b.box('portal-header-'+str(x),(x,47.75,2.326),(.18,.24,2.7),'steel')
        b.sign('portal-sign-'+str(x),(x,47.25,2.326),2.1,.35,'空中径路','SKYWAY · 10F',face='east'if x<0 else'west',accent='#bed6dc')
    b.view('long',(-60,46.85,2.326),(55,46.85,2.326),PHOTO+'img_skyway_01.jpg',['existing 45.2m walkway','south frosted base','roof tie rhythm'])
    b.view('outward',(-15,46.85,2.326),(-6,46.85,12),PHOTO+'img_skyway_02.jpg',['clear north windows','rail brackets','city-facing view'])
    b.view('portal',(58,46.85,2.326),(66,47.0,2.326),PHOTO+'img_skyway_01.jpg',['east Skyway portal','retained walkway termination','frosted base and roof ties'])
    b.route('through',[(-61,45.2,2.326),(0,45.2,2.326),(65,45.2,2.326)])


def forecourt(b):
    b.zone('stonemuseum');colors=['ivory','stone','dark-stone','rose','graphite','oak']
    # Six small shelters on the north side, as stated in the operator guide.
    for i,x in enumerate([-67,-47,-13,38,60,82]):
        z=34.5
        b.box('shelter-roof-'+str(i),(x,3.4,z),(5.4,.25,4.0),'ivory')
        b.box('shelter-base-'+str(i),(x,-.104,z),(5.6,.22,4.4),'stone',role='north shelter paving')
        for side in [-1,1]:
            px=x+side*2.0;b.box(f'column-{i}-{side}',(px,1.7,z),(.8,3.4,.8),'dark-stone')
            for row in range(3):
                for col in range(2):
                    b.box(f'sample-{i}-{side}-{row}-{col}',(px+(col-.5)*.32,.8+row*.48,z-.417),(.27,.36,.025),colors[(i+row+col)%len(colors)],False)
        b.cylinder('shelter-lamp-'+str(i),(x,3.255,z),.25,.035,'light',False,32)
        b.sign('museum-label-'+str(i),(x+2,2.45,z-.43),.62,.29,'石の博物館','STONE MUSEUM',face='south')
        b.bench('forecourt-bench-'+str(i),x,0,z+.7,2.6)
    # Paved connection beyond the retained north edge; avoid filling the Porta
    # mouth by starting at z=29. Existing central concourse reaches that line.
    b.box('paved-apron',(10,-.18,34.5),(160,.36,11),'ivory',role='north public forecourt')
    for i in range(30):b.cylinder('street-bollard-'+str(i),(-67+i*5.2,.42,40.0),.07,.84,'steel')
    b.sign('bus-direction',(-47,2.15,37),3,.55,'バスのりば','CITY BUS TERMINAL',face='south',accent='#739fa6')
    b.view('inside',(-12,1.7,24),(-13,1.7,35),PHOTO+'img_stonemuseum_01.jpg',['north station boundary','shelter column sample arrays','paved apron'])
    b.view('outside',(-21,1.7,39),(-13,1.7,34),PHOTO+'img_stonemuseum_01.jpg',['same shelter reverse','stone insets','station entrance behind'])


def build(b):
    garden(b);east_square(b);upper_retail(b);skyway(b);forecourt(b)
