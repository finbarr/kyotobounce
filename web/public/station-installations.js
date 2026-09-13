import * as THREE from 'three';

// Original evening artwork on the documented staircase, East Square wall and
// Skyway. Three static batches, three time uniforms, no individual LED lights
// or per-frame texture uploads. Daytime architecture and physics are unchanged.
export function createStationInstallations(scene,meta){
 const data=meta.stationInstallations;
 if(!data)return {setNight(){},update(){},dispose(){},stats:{drawCalls:0}};
 const root=new THREE.Group();root.name='Station evening installations';root.visible=false;scene.add(root);
 const uniforms=[];
 function batch(name,kind,positions,uv){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeBoundingSphere();
  const time={value:0};uniforms.push(time);
  const material=new THREE.ShaderMaterial({uniforms:{time},side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2,
   vertexShader:'varying vec2 artwork; void main(){artwork=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
   fragmentShader:`uniform float time; varying vec2 artwork;
    float stripe(float v,float w){float f=max(fwidth(v),.001);return 1.-smoothstep(w-f,w+f,abs(fract(v)-.5));}
    void main(){vec2 p=artwork;float t=time*.12;vec3 color;
     ${kind===0?`float wave=sin(p.x*15.+p.y*9.-t*2.);float petals=pow(max(0.,sin(p.x*18.+sin(p.y*12.)+t)),9.);
       color=mix(vec3(.012,.045,.12),vec3(.035,.35,.48),.5+.5*wave)+petals*vec3(1.3,.28,.36);
       color+=stripe(p.y*75.+p.x*4.-t,.04)*vec3(.35,.24,.06);`:
       kind===1?`float stars=pow(max(0.,sin(p.x*131.+sin(p.y*53.))),35.);float ribbons=pow(.5+.5*sin(p.x*18.-p.y*4.+t),10.);
       color=vec3(.01,.03,.11)+stars*vec3(.7,.9,1.8)+ribbons*vec3(.08,.3,.7);`:
       `vec2 q=p-vec2(.67,.62);float moon=1.-smoothstep(.13,.134,length(q));float hills=sin(p.x*9.+t)*.035+.17;
       color=mix(vec3(.012,.055,.12),vec3(.018,.14,.17),smoothstep(0.,.9,p.y));
       color+=moon*vec3(.9,.63,.24);color*=smoothstep(hills-.01,hills+.01,p.y);
       float blossom=pow(max(0.,sin(p.x*37.+sin(p.y*29.)+t)),24.)*smoothstep(.3,.6,p.y);
       color+=blossom*vec3(.45,.10,.16);`}
     gl_FragColor=vec4(color,1.);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`});
  const mesh=new THREE.Mesh(geometry,material);mesh.name=name;root.add(mesh);
 }
 const quad=(positions,uv,a,b,c,d,coords=[[0,0],[1,0],[1,1],[0,1]])=>{
  for(const i of [0,1,2,0,2,3]){const p=[a,b,c,d][i];positions.push(p[0],p[1],-p[2]);uv.push(...coords[i]);}
 };
 let p=[],uv=[];
 for(const [row,r]of data.risers.entries())for(let i=0;i<r.points.length-1;i++){
  const a=r.points[i],b=r.points[i+1];
  quad(p,uv,[a.x,r.bottom,a.y],[b.x,r.bottom,b.y],[b.x,r.top,b.y],[a.x,r.top,a.y],[[i/(r.points.length-1),row/data.risers.length],[(i+1)/(r.points.length-1),row/data.risers.length],[(i+1)/(r.points.length-1),(row+1)/data.risers.length],[i/(r.points.length-1),(row+1)/data.risers.length]]);
 }
 batch('Grand Staircase evening picture',0,p,uv);
 p=[];uv=[];const s=data.skyway;
 for(const z of s.z)quad(p,uv,[s.start,s.y,z],[s.end,s.y,z],[s.end,s.y+.11,z],[s.start,s.y+.11,z]);
 batch('Skyway star bridge ribbons',1,p,uv);
 p=[];uv=[];const wall=data.eastWall,[x,y,z]=wall.center;
 quad(p,uv,[x,y-wall.height/2,z-wall.width/2],[x,y-wall.height/2,z+wall.width/2],[x,y+wall.height/2,z+wall.width/2],[x,y+wall.height/2,z-wall.width/2]);
 batch('East Square seasonal wall artwork',2,p,uv);
 return {setNight(value){root.visible=value;},update(time){if(root.visible)for(const u of uniforms)u.value=time;},dispose(){root.removeFromParent();for(const mesh of root.children){mesh.geometry.dispose();mesh.material.dispose();}},stats:{drawCalls:3,triangles:root.children.reduce((n,m)=>n+m.geometry.attributes.position.count/3,0)}};
}
