"""Original metre-scaled fixtures, package shapes and sign typography for K025.
Every solid box, including products, is also a native box. Flat labels/finishes
are decorative and sit on their support; no invisible fixture envelope is used.
"""
import bpy, math

def furnish(box,mat,m,position,angle,cfg):
    for key,col,metal,rough,emit in [
        ('white',(.82,.84,.80),0,.5,0),('ink',(.012,.055,.037),0,.7,0),
        ('light',(.93,.96,1),0,.3,4),('labelwhite',(.95,.96,.89),0,.45,.6),
        ('wood',(.34,.19,.085),0,.65,0),('black',(.018,.023,.025),.15,.38,0),
        ('blue',(.035,.24,.58),0,.4,0),('yellow',(.94,.63,.06),0,.5,0),
        ('pink',(.75,.13,.25),0,.5,0),('tea',(.22,.45,.065),0,.4,0),
        ('rice',(.82,.77,.58),0,.6,0)]:m[key]=mat('K025 '+key,col,metal,rough,emit)
    def text(name,body,u,y,v,size=.16,color='ink',facing=0):
        bpy.ops.object.text_add();o=bpy.context.object;o.name='konbini-'+name
        o.data.body=body;o.data.align_x='CENTER';o.data.size=size;o.data.extrude=0
        q=position(u,y,v);o.location=(q['x'],q['z'],q['y']);o.rotation_euler=(math.pi/2,0,-angle+facing)
        o.data.materials.append(m[color]);bpy.ops.object.convert(target='MESH');o['kyoto_physical']='';o['kyoto_collision']=False
    # Reference order viewed bottom to top: red, green, orange.
    for i,col in enumerate(['red','green','orange']):box('band-'+col,0,2.39+i*.13,-.094,5.85,.09,.025,col,collision=False)
    box('identity-lightbox',0,2.84,-.13,4.5,.45,.09,'labelwhite','steel')
    text('shop-name','7-ELEVEN  Heart-in',0,2.72,-.18,.34)
    # Stacked storefront badge, original geometric 7 and simple typography.
    box('badge',-2.48,2.73,-.15,.65,.7,.09,'labelwhite','steel')
    text('seven','7',-2.48,2.57,-.201,.57,'red')
    text('eleven','ELEVEN',-2.48,2.54,-.208,.105,'green')
    text('badge-heart','Heart-in',-2.48,2.43,-.208,.105,'red')
    for side in [-1,1]:
        u=side*1.95
        for du in [-.98,0,.98]:box(f'mullion-{side}-{du}',u+du,1.12,-.10,.045,2.24,.055,'frame','steel')
        for y in [.09,2.19]:box(f'window-rail-{side}-{y}',u,y,-.10,2,.05,.055,'frame','steel')
        box(f'window-stripe-{side}',u,1.03,-.091,1.94,.12,.018,'labelwhite',collision=False)
        text(f'window-brand-{side}','7-ELEVEN',u,.997,-.105,.105,'green')
        box(f'door-handle-{side}',side*1.02,1.32,-.16,.027,.32,.06,'frame','steel')
    # Open automatic door track stays above the unchanged clear opening.
    box('door-track',0,2.28,-.12,1.8,.055,.10,'frame','steel')
    # Flush tile joints do not introduce fake collision ridges.
    for i in range(-4,5):box(f'floor-grout-u-{i}',i*.6,.001,2.25,.012,.001,4.5,'wall',collision=False)
    for i in range(1,8):box(f'floor-grout-v-{i}',0,.001,i*.55,6,.001,.012,'wall',collision=False)
    for u in [-1.7,0,1.7]:
        for v in [1.2,3.25]:
            box(f'ceiling-fixture-{u}-{v}',u,3.035,v,.20,.08,1.45,'frame','steel')
            box(f'ceiling-lens-{u}-{v}',u,2.988,v,.15,.012,1.35,'light',collision=False)
    # Back-wall refrigerated cases: shallow enough to preserve the mat and rear aisle.
    for j,u in enumerate([-1.0,0,1.0]):
        box(f'fridge-back-{j}',u,1.16,4.39,.94,2.2,.12,'white','steel')
        box(f'fridge-base-{j}',u,.15,4.08,.94,.3,.65,'black','steel')
        box(f'fridge-top-{j}',u,2.24,4.08,.94,.12,.65,'white','steel')
        for du in [-.46,.46]:box(f'fridge-frame-{j}-{du}',u+du,1.25,3.78,.045,1.94,.07,'frame','steel')
        for row in range(4):
            y=.43+row*.43
            box(f'fridge-shelf-{j}-{row}',u,y,4.07,.9,.035,.56,'white','steel')
            for k in range(5):
                pu=u+(k-2)*.16;col=['tea','blue','yellow','white','pink'][(k+j)%5]
                box(f'drink-{j}-{row}-{k}',pu,y+.145,4.04,.11,.25,.13,col,'plastic')
                box(f'drink-cap-{j}-{row}-{k}',pu,y+.285,4.04,.07,.03,.08,'white','plastic')
        box(f'fridge-glass-{j}',u,1.22,3.80,.86,1.86,.018,'glass','glass')
        box(f'fridge-handle-{j}',u+.33,1.12,3.74,.025,.38,.055,'frame','steel')
    box('cold-category-board',0,2.48,4.32,3.1,.3,.08,'green','steel')
    text('cold-category','DRINKS  /  CHILLED',0,2.40,4.27,.21,'labelwhite')
    # Two low gondolas down the sides; full 2.8m central aisle retained.
    for side in [-1,1]:
        u=side*2.18
        box(f'shelf-plinth-{side}',u,.12,2.65,.83,.24,1.8,'wood','wood')
        for v in [1.77,3.53]:box(f'shelf-end-{side}-{v}',u,.88,v,.83,1.52,.04,'white','steel')
        for row in range(4):
            y=.32+row*.35
            box(f'shelf-deck-{side}-{row}',u,y,2.65,.83,.035,1.8,'white','steel')
            for k in range(7):
                v=1.92+k*.235
                box(f'package-{side}-{row}-{k}',u-side*.19,y+.125,v,.28,.21,.17,['yellow','pink','rice','tea'][(k+row)%4],'plastic')
                box(f'package-label-{side}-{row}-{k}',u-side*.335,y+.13,v,.004,.07,.11,'labelwhite',collision=False)
        box(f'shelf-category-{side}',u,1.83,1.75,.88,.24,.045,'green','steel')
        text(f'shelf-category-text-{side}','SNACKS' if side==1 else 'BREAD',u,1.77,1.718,.15,'labelwhite')
    # Compact cashier at the front right, outside both entrance and receiving circle.
    box('checkout-base',1.99,.49,.88,1.18,.98,.7,'wood','wood')
    box('checkout-top',1.99,1.005,.88,1.28,.07,.78,'white','stone')
    box('register-foot',1.9,1.10,.98,.24,.16,.23,'black','plastic')
    box('register-screen',1.9,1.29,1.04,.42,.27,.065,'black','plastic')
    box('register-display',1.9,1.29,1.003,.35,.20,.008,'blue',collision=False)
    box('payment-terminal',1.57,1.09,.62,.14,.10,.18,'black','plastic')
    text('checkout-label','CHECKOUT',1.99,.69,.521,.15,'labelwhite')
    box('coffee-machine',2.40,1.28,.95,.26,.48,.32,'black','steel')
    text('coffee-label','CAFE',2.40,1.32,.782,.07,'labelwhite')
