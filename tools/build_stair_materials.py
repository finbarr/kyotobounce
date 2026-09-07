# /// script
# dependencies = ["numpy", "pillow"]
# ///
"""Original metric granite and escalator maps; photographs are observations only."""
from pathlib import Path
import argparse, hashlib, json
import numpy as np
from PIL import Image

p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True)
args=p.parse_args();args.output.mkdir(parents=True,exist_ok=True)
size=1024;repeat=2.4
u,v=np.meshgrid((np.arange(size)+.5)*repeat/size,(np.arange(size)+.5)*repeat/size)
def noise(seed,frequency):
    rng=np.random.default_rng(seed);f=np.fft.fftfreq(size)*size
    z=np.fft.ifft2(np.fft.fft2(rng.normal(size=(size,size)))*np.exp(-(f[:,None]**2+f[None,:]**2)/(2*frequency**2))).real
    return z/max(z.std(),1e-9)
grain=noise(124,190);broad=noise(312,14);fine=noise(812,350)
base=np.clip(np.array([.29,.30,.295])+(.024*grain+.012*broad+.015*np.maximum(fine-1,0))[...,None],0,1)
height=.00006*grain+.000025*fine
joint=(np.minimum(np.mod(u,.6),.6-np.mod(u,.6))<.0015).astype(float)
base*=1-.20*joint[...,None]
rows=[]
def save(name,color,h,rough,metal,description):
    # Equal metric texel spacing. +V is upward in the stored image.
    du=(np.roll(h,-1,axis=1)-np.roll(h,1,axis=1))/(2*repeat/size)
    dv=(np.roll(h,-1,axis=0)-np.roll(h,1,axis=0))/(2*repeat/size)
    normal=np.dstack([-du,-dv,np.ones_like(h)]);normal/=np.linalg.norm(normal,axis=2)[...,None]
    mask=np.dstack([np.full_like(h,metal),np.ones_like(h),np.zeros_like(h),1-np.clip(rough,0,1)])
    files={}
    for role,array in [('Color',color),('Normal',normal*.5+.5),('Mask',mask)]:
        path=args.output/(name+role+'.png');Image.fromarray(np.uint8(np.clip(array[::-1],0,1)*255+.5)).save(path)
        files[role.lower()]={'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    rows.append({'id':name,'repeatMeters':repeat,'description':description,'files':files})
save('StairStone',base,height,np.clip(.74+.025*broad,.64,.88),0,'Dark grey granite with an inferred 600 mm width module and 3 mm joints.')
# An inset pale granular nosing band; this is a color/roughness treatment only.
band=((v>=.004)&(v<=.029)).astype(float)
top=base*(1-band[...,None])+np.clip(np.array([.59,.60,.58])+(.035*grain)[...,None],0,1)*band[...,None]
save('StairTread',top,height,np.clip(.74+.025*broad+.07*band,.64,.90),0,'Same granite with an inferred 25 mm pale nosing band, inset 4 mm from the front edge.')
groove=(.5+.5*np.cos(2*np.pi*u/.008))**5
metalcolor=np.clip(np.array([.17,.18,.19])-(.07*groove)[...,None]+(.003*noise(912,60))[...,None],0,1)
save('EscalatorTread',metalcolor,-.0004*groove,np.clip(.48+.04*groove+.02*noise(922,18),.35,.65),1,'Dark ribbed metal; 8 mm pitch and 0.4 mm relief are authored visual estimates, not contact geometry.')
spec={'schemaVersion':1,'size':size,'repeatMeters':repeat,'normalConvention':'Tangent +Y; image rows reverse texture V.','maskConvention':'Linear RGBA: R metallic, G occlusion=1, B unused=0, A smoothness.','provenance':'Original deterministic maps; no reference pixels sampled or embedded. Dimensions, reflectance and roughness are authored estimates.','physicalScope':'Visual material maps only. Ball coefficients remain separately assigned.','materials':rows,'generatorSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
(args.output/'material-spec.json').write_text(json.dumps(spec,indent=2)+'\n')
print('Generated',len(rows)*3,'original stair/escalator maps')
