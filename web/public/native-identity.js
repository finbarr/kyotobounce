// The old game stored a random UUID bearer token on this origin. Derive the
// new credential locally; the migration stores only its SHA-256, never tokens.
export async function nativeCredential(id,token){
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
 if(!uuid.test(id)||!uuid.test(token))return null;
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('kyoto-native-identity-1:'+token)));
 return id+'.'+btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
}
export async function initialProfile(store,endpoint){
 let profile=await store.setting('profile');if(profile)return profile;
 let token,id;
 try{id=localStorage.getItem('kyoto-guest-id');token=await nativeCredential(id,localStorage.getItem('kyoto-guest'));}catch{}
 if(endpoint&&token){
  await store.setting('online:'+endpoint+':credential',token);
  profile={id,name:'Player',named:false,nativePending:true};
  // Recovery failing must not prevent offline play or replace the old identity.
  try{const response=await fetch(endpoint+'/v1/identity',{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(5000)});if(response.ok){const saved=await response.json();if(saved.id===id&&typeof saved.name==='string')profile={id,name:saved.name,named:!!saved.named};}}catch{}
 }else profile={id:crypto.randomUUID(),name:'Player',named:false};
 await store.setting('profile',profile);return profile;
}
