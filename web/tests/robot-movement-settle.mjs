// Actual assets-v2 rig: walking followed by a turn must settle both feet.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as T from 'three';
import {createAvatar,poseAvatar,setAvatarCharacter} from '../public/avatar.js';
const bytes=await readFile('web/public/assets/ori.glb');
const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const rows=[];
for(const character of ['ori','koma','don'])for(const heading of [0,90,225])for(const turn of [-270,-180,90,180,270])for(const walking of [false,true]){
 const a=createAvatar(asset,{character}),p={id:'p',yaw:180-heading,pitch:12,top:0,kick:0,power:0,grounded:true};
 a.group.rotation.y=heading*Math.PI/180;let time=0;
 const pose=()=>poseAvatar(a,p,'Aim',{owner:''},time+=1/60);
 const feet=()=>['L','R'].map(s=>a.group.worldToLocal(a.bones[`foot.${s}`].getWorldPosition(new T.Vector3())));
 pose();const neutral=feet();
 for(let i=0;i<(walking?60:1);i++){if(walking)a.group.position.add(new T.Vector3(0,0,1.4/60).applyQuaternion(a.group.quaternion));pose();}
 for(let i=0;i<30;i++){a.group.rotation.y+=turn/30*Math.PI/180;pose();}
 const root=a.group.position.clone();
 for(let i=0;i<300;i++)pose();
 const stopped=feet(),error=Math.max(...stopped.map((f,i)=>f.distanceTo(neutral[i])));
 setAvatarCharacter(a,character==='ori'?'koma':'ori');for(let i=0;i<60;i++)pose();
 rows.push({character,heading,turn,walking,error,blend:a.walkBlend,hips:a.bones.hips.position.toArray(),feet:stopped.map(f=>f.toArray()),rootError:a.group.position.distanceTo(root)});
}
const output=process.env.KYOTO_TEST_OUTPUT||'.local/station-detail/settle.json';await mkdir(output.slice(0,output.lastIndexOf('/')),{recursive:true});await writeFile(output,JSON.stringify(rows,null,2)+'\n');
// Turning in place may finish within the existing 18 mm settling deadband;
// these cases must still be balanced within 10 mm and completely inactive.
assert.ok(rows.every(r=>r.error<(r.walking?.001:.01)&&r.blend===0),'Both feet settle beneath the body after turns, including character changes');
assert.ok(rows.every(r=>r.rootError===0),'Pose never moves the authoritative root');
console.log(`PASS ${rows.length} actual-rig walk/turn/stop cases; max foot error ${Math.max(...rows.map(r=>r.error))}`);
