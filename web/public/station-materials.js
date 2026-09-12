import * as THREE from 'three';

// Original, deterministic periodic microstructure. No photography, baked light,
// UV edits or asset downloads. RG encodes tangent normal XY, B roughness, A grain.
export function generateStationGrain(size=512){
  const albedo=new Uint8Array(size*size*4),surface=new Uint8Array(size*size*4);
  const height=new Float32Array(size*size),grain=new Float32Array(size*size);
  const hash=(x,y)=>{let n=Math.imul(x+13,374761393)^Math.imul(y+71,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
  const cells=96,wrap=x=>(x%cells+cells)%cells;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const px=x/size*cells,py=y/size*cells,cx=Math.floor(px),cy=Math.floor(py);
    let nearest=9,mineral=0;
    for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){
      const gx=cx+i,gy=cy+j,h=hash(wrap(gx),wrap(gy));
      const dx=gx+.15+.7*h-px,dy=gy+.15+.7*hash(wrap(gx)+cells,wrap(gy))-py,d=dx*dx+dy*dy;
      if(d<nearest){nearest=d;mineral=h;}
    }
    const k=y*size+x,noise=hash(x+300,y+600);
    grain[k]=mineral;height[k]=(.25+.75*mineral)*.000045+noise*.000009;
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const k=y*size+x,p=k*4,g=grain[k],mica=g<.19,quartz=g>.76;
    // Small dark mica and pale quartz crystals; average albedo stays near white
    // because this is layered over the existing station-specific base color.
    const v=mica?150+g*110:quartz?235+(g-.76)*80:194+g*48;
    albedo.set([v,v+(quartz?1:0),v-(quartz?4:1),255],p);
    const at=(a,b)=>height[((b+size)%size)*size+(a+size)%size];
    const nx=-(at(x+1,y)-at(x-1,y))/(.64/size),ny=-(at(x,y+1)-at(x,y-1))/(.64/size),len=Math.hypot(nx,ny,1);
    surface.set([128+127*nx/len,128+127*ny/len,Math.round(255*(mica?.32:quartz?.46:.64)),Math.round(g*255)],p);
  }
  return {albedo,surface,size};
}

export function createStationTextures(renderer){
  const {albedo,surface,size}=generateStationGrain(),textures=[];
  const make=(bytes,n,name,colorSpace=THREE.NoColorSpace)=>{
    const t=new THREE.DataTexture(bytes,n,n,THREE.RGBAFormat);t.name=name;t.colorSpace=colorSpace;
    t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;
    t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());t.needsUpdate=true;textures.push(t);return t;
  };
  const stoneColor=make(albedo,size,'K026 mineral albedo · 0.32m',THREE.SRGBColorSpace);
  const stoneSurface=make(surface,size,'K026 mineral normal XY / roughness');
  const n=256,metal=new Uint8Array(n*n*4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    // Long horizontal satin strokes, continuous at both texture boundaries.
    const stroke=Math.sin(y*2*Math.PI*73/n)+.45*Math.sin(y*2*Math.PI*109/n+x*2*Math.PI*2/n);
    metal.set([128,128+stroke*7,128+stroke*30,235+stroke*10],(y*n+x)*4);
  }
  const steelSurface=make(metal,n,'K026 brushed steel · 0.12m');
  return {stoneColor,stoneSurface,steelSurface,textures,bytesWithMipmaps:Math.round((size*size*8+n*n*4)*4/3),dispose(){textures.forEach(t=>t.dispose());}};
}

// These separately authored fixture palettes include products, sculpture, signs
// and emissive shop trim. Generic station finishes must not reinterpret them.
export const isAuthoredStationFixture=name=>/^k02[5789][- ]/i.test(name);

// Ordered, explicit recognition covers current exports AND retained old names.
export function stationMaterialFamily(name){
  if(isAuthoredStationFixture(name))return null;
  if(/tactile|nosing.*yellow|lettering|sign|indicator|diffuser|lens|lamp|poster|information/i.test(name))return null;
  if(/Garden guard glazing|Shop window glazing|Glass -/i.test(name))return 'guard';
  if(/Reflective facade glazing|North courtyard coated glazing/i.test(name))return 'facade';
  if(/Stair stone|Stair nosing finish|East stair/i.test(name))return 'stair';
  if(/honed granite floor|Warm ivory tile/i.test(name))return 'floor';
  if(/Garden pale paving|Garden mineral curbs|Garden dark insets/i.test(name))return 'paving';
  if(/brushed|satin gate stainless|Silver facade|Steel -/i.test(name))return 'stainless';
  if(/Canopy steel|Dark facade framing|satin mullions|Garden steel|Garden yellow beds|safety enamel|terrace dark metal|hall ceiling grid|Dark fastener/i.test(name))return 'paint';
  if(/Granite -|Stone -|dark mineral base|recess backing|frontage recess stone|polished granite/i.test(name))return 'stone';
  if(/Pale cladding|enclosure mineral|Facade -|pale mineral|structural mineral|Rose facade|Warm interior panels|hall ceiling coffers/i.test(name))return 'wall';
  return null;
}

// Retain the legacy granite map's color/joints and normals with a bounded GPU
// upload. Its 4096px pair costs 170.7 MiB with mipmaps; micro-detail now has its
// own metric atlas, so a 1024px derivative preserves the base tiling affordably.
// No sign, tactile or stair/nosing texture is resampled.
export function prepareGraniteMaps(material){
  const resized=[];
  if(!/honed granite floor/i.test(material.name))return resized;
  for(const key of ['map','normalMap']){
    const texture=material[key],image=texture?.image;
    if(!image||Math.max(image.width,image.height)<=1024)continue;
    const ratio=1024/Math.max(image.width,image.height),canvas=document.createElement('canvas');
    canvas.width=Math.round(image.width*ratio);canvas.height=Math.round(image.height*ratio);
    const context=canvas.getContext('2d');context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(image,0,0,canvas.width,canvas.height);
    resized.push({material:material.name,slot:key,source:[image.width,image.height],upload:[canvas.width,canvas.height]});
    texture.image=canvas;texture.needsUpdate=true;
  }
  return resized;
}

const roughness={floor:.32,wall:.56,stone:.4,paving:.65,stair:.6,stainless:.28,paint:.43,guard:.09,facade:.14};
export function applyStationMaterial(material,family,textures,reflections){
  const m=material; m.userData.stationFamily=family;
  // K032: only the bare exported stone cladding needs new slab courses.
  // The 9.6m floor atlas already contains its 1.2 x .6m tile joints; stairs,
  // polished frontage maps, relief/coffers and authored fixtures retain theirs.
  const slabCourses=!m.map&&(/Granite - plain draft|Pale cladding/i.test(m.name));
  if(family==='floor')for(const key of ['map','normalMap'])if(m[key]){
    m[key].anisotropy=textures.stoneColor.anisotropy;m[key].needsUpdate=true;
  }
  m.metalness=family==='stainless'?1:0;m.roughness=roughness[family];m.envMapIntensity=family==='stainless'?1:.85;
  // Preserve the original color/normal maps, especially the UV-authored nosing.
  if(family==='floor')m.color.set(m.map?0xc8cbc7:0x747b78);
  if(family==='wall')m.color.set(/Rose/.test(m.name)?0x98877c:/coffers/.test(m.name)?0xb5b8b1:0xb7b9b0);
  if(family==='stone')m.color.set(m.map?0xb7bab5:0x555c59);
  if(family==='stair')m.color.set(0xc5cac3);
  if(family==='stainless')m.color.set(0xbfc5c6);
  if(family==='paint'&&/Canopy/.test(m.name))m.color.set(0x8e9b9d);
  const glass=family==='guard'||family==='facade',mineral=['floor','wall','stone','paving','stair'].includes(family);
  if(glass){
    m.color.set(family==='guard'?0xd0e3dd:0x789c9f);m.transparent=true;m.opacity=1;m.depthWrite=false;
    m.side=THREE.DoubleSide;m.forceSinglePass=true;m.envMapIntensity=1;
    // Single-pass thin glass: Fresnel coverage below preserves reflections at
    // grazing angles without a screen-space transmission render of the station.
  }
  m.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{stationGrain:{value:textures.stoneColor},stationSurface:{value:family==='stainless'?textures.steelSurface:textures.stoneSurface},...reflections.uniforms});
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
varying vec3 vStationPosition;
varying vec3 vStationNormal;`).replace('#include <begin_vertex>',`#include <begin_vertex>
vStationPosition=(modelMatrix*vec4(transformed,1.0)).xyz;
vStationNormal=normalize(mat3(modelMatrix)*objectNormal);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vStationPosition;
varying vec3 vStationNormal;
uniform sampler2D stationGrain;
uniform sampler2D stationSurface;
// Integral of a periodic unit-height stripe, giving its true pixel coverage.
// Unlike widening a smoothstep, this retains a 4mm physical joint and its
// correct distant mean, including footprints spanning several complete slabs.
vec2 stationJointIntegral(vec2 x,vec2 duty){
  return floor(x)*duty+min(fract(x),duty);
}
float stationSlabJoint(vec2 metric){
  vec2 period=vec2(1.44,.72),duty=vec2(.004)/period;
  vec2 p=metric/period+duty*.5;
  vec2 footprint=max(fwidth(metric)/period,vec2(.00001));
  vec2 coverage=clamp((stationJointIntegral(p+footprint*.5,duty)-stationJointIntegral(p-footprint*.5,duty))/footprint,0.0,1.0);
  return coverage.x+coverage.y-coverage.x*coverage.y;
}
mat3 stationFrame(vec3 p,vec3 n,vec2 uv){
  vec3 a=dFdx(p),b=dFdy(p);vec2 u=dFdx(uv),v=dFdy(uv);
  vec3 bp=cross(b,n),ap=cross(n,a),t=bp*u.x+ap*v.x,s=bp*u.y+ap*v.y;
  float scale=inversesqrt(max(max(dot(t,t),dot(s,s)),1e-12));return mat3(t*scale,s*scale,n);
}`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec3 sn=abs(normalize(vStationNormal));
vec2 metric=sn.y>.65?vStationPosition.xz:(sn.x>sn.z?vStationPosition.zy:vStationPosition.xy);
${mineral?`
vec2 guv=metric/.32;
vec3 grainA=texture2D(stationGrain,guv).rgb;
vec3 grainB=texture2D(stationGrain,guv*.731+vec2(.37,.61)).rgb;
vec4 micro=texture2D(stationSurface,guv);
// Two nonmatching periods suppress recognizable stamping; filtering supplies
// stable distant means instead of per-pixel noise or artificial grain fading.
diffuseColor.rgb*=mix(vec3(1.0),mix(grainA,grainB,.3),${family==='stair'?'.22':'.66'});
${slabCourses?`
// Photosphere/Street View: fine pale joints in honed stone slab courses.
// Restrict to vertical cladding; broad horizontal soffits are not tile floors.
float slabJoint=stationSlabJoint(metric)*(1.0-smoothstep(.10,.25,sn.y));
diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*1.28,slabJoint);
`:family==='wall'?`
vec2 edge=abs(fract(metric/vec2(1.44,.72)+.5)-.5)*vec2(1.44,.72);
vec2 aa=max(fwidth(metric),vec2(.001));
vec2 seam=(1.0-smoothstep(vec2(.002),vec2(.002)+aa,edge))*min(vec2(1.0),vec2(.002)/aa);
float joint=max(seam.x,seam.y);diffuseColor.rgb*=1.0-joint*.22;`:''}
`:family==='stainless'?`
vec2 guv=metric/.12;
vec4 micro=texture2D(stationSurface,guv);
diffuseColor.rgb*=.96+.04*micro.a;
`:''}`);
    if(mineral||family==='stainless'){
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
roughnessFactor=clamp(roughnessFactor+(micro.b-.5)*${family==='stainless'?'.18':'.24'},.18,.85);`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
vec2 grainSlope=(micro.rg*2.0-1.0)*${family==='stair'?'.35':'.8'};
normal=normalize(stationFrame(-vViewPosition,normal,guv)*vec3(grainSlope,sqrt(max(.01,1.0-dot(grainSlope,grainSlope)))));`);
    }
    reflections.patch(shader);
    if(glass)shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
// Schlick dielectric reflectance F0=.04 (IOR 1.5). Separate coverage from
// specular energy; ordinary opacity would erase reflections on clear guards.
float fresnel=.04+.96*pow(1.0-saturate(dot(normal,geometryViewDir)),5.0);
float coverage=clamp(${family==='guard'?'.07':'.25'}+fresnel*.88,0.0,.97);
outgoingLight=(totalDiffuse*${family==='guard'?'.045':'.17'}+totalSpecular)/max(coverage,.04)+totalEmissiveRadiance;
diffuseColor.a=coverage;
#include <opaque_fragment>`);
  };
  m.customProgramCacheKey=()=>`K032-pbr-2-${family}-${slabCourses}`;m.needsUpdate=true;
}
