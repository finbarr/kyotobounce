// A small graph codec for private verifier checkpoints. JSON alone loses signed
// zero, infinities, undefined, Maps, Sets and shared references. No V8-specific
// byte format or executable constructors are needed by a replacement Worker.
export function encodeState(value){
 const nodes=[],seen=new Map();
 function token(v){
  if(v===undefined)return ['u'];
  if(typeof v==='number'&&(!Number.isFinite(v)||Object.is(v,-0)))return ['n',Object.is(v,-0)?'-0':String(v)];
  if(v===null||['string','number','boolean'].includes(typeof v))return v;
  if(typeof v!=='object')throw Error('Unsupported checkpoint value');
  if(seen.has(v))return ['r',seen.get(v)];
  const id=nodes.length;seen.set(v,id);nodes.push(null);
  if(Array.isArray(v))nodes[id]=['a',Array.from(v,token)];
  else if(v instanceof Map)nodes[id]=['m',Array.from(v,([k,x])=>[token(k),token(x)])];
  else if(v instanceof Set)nodes[id]=['s',Array.from(v,token)];
  else{
   const prototype=Object.getPrototypeOf(v);if(prototype!==Object.prototype&&prototype!==null)throw Error('Unsupported checkpoint object');
   nodes[id]=[prototype===null?'z':'o',Object.entries(v).map(([k,x])=>[k,token(x)])];
  }
  return ['r',id];
 }
 const root=token(value);return JSON.stringify({root,nodes});
}
export function decodeState(text){
 const {root,nodes}=JSON.parse(text),fail=()=>{throw Error('Invalid checkpoint graph');};
 if(!Array.isArray(nodes)||nodes.length>100000)fail();
 const values=nodes.map(node=>{
  if(!Array.isArray(node)||node.length!==2||!Array.isArray(node[1]))fail();
  switch(node[0]){case'a':return [];case'm':return new Map();case's':return new Set();case'o':return {};case'z':return Object.create(null);default:return fail();}
 });
 function token(v){
  if(v===null||['string','number','boolean'].includes(typeof v))return v;
  if(!Array.isArray(v))return fail();
  if(v.length===1&&v[0]==='u')return undefined;
  if(v.length!==2)return fail();
  if(v[0]==='r'&&Number.isSafeInteger(v[1])&&v[1]>=0&&v[1]<values.length)return values[v[1]];
  if(v[0]==='n')switch(v[1]){case'-0':return -0;case'Infinity':return Infinity;case'-Infinity':return -Infinity;case'NaN':return NaN;}
  return fail();
 }
 nodes.forEach(([kind,items],i)=>{
  const value=values[i];
  if(kind==='a'||kind==='s'){for(const item of items){const decoded=token(item);kind==='a'?value.push(decoded):value.add(decoded);}return;}
  for(const pair of items){
   if(!Array.isArray(pair)||pair.length!==2)fail();
   if(kind==='m')value.set(token(pair[0]),token(pair[1]));
   else{if(typeof pair[0]!=='string'||Object.hasOwn(value,pair[0]))fail();Object.defineProperty(value,pair[0],{value:token(pair[1]),writable:true,enumerable:true,configurable:true});}
  }
 });
 return token(root);
}
