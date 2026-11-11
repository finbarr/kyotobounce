export function verifierConfig(env=process.env){
 const projectId=env.GOOGLE_CLOUD_PROJECT,port=Number(env.PORT||env.KYOTO_VERIFY_PORT||4432);
 if(!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(projectId||'')||!Number.isInteger(port)||port<1||port>65535)throw Error('Set GOOGLE_CLOUD_PROJECT and a valid verifier port');
 if(env.K_SERVICE&&env.FIRESTORE_EMULATOR_HOST)throw Error('A managed verifier cannot use the local database emulator');
 if(env.FIRESTORE_EMULATOR_HOST&&!projectId.startsWith('demo-'))throw Error('The database emulator requires a demo project');
 const production=env.NODE_ENV==='production';
 if(production&&!env.KYOTO_ALLOWED_ORIGINS)throw Error('Set explicit KYOTO_ALLOWED_ORIGINS');
 const origins=(env.KYOTO_ALLOWED_ORIGINS||'http://127.0.0.1:4430,http://localhost:4430').split(',').map(value=>{
  const url=new URL(value.trim());
  if(url.origin!==value.trim()||url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('Use exact HTTPS browser origins, or loopback origins for local testing');
  return url.origin;
 });
 if(production&&!env.KYOTO_VERIFIER_RELEASE)throw Error('A production verifier requires a pinned release receipt');
 const limits=env.KYOTO_VERIFY_LIMITS_JSON?JSON.parse(env.KYOTO_VERIFY_LIMITS_JSON):undefined;
 const sliceMs=Number(env.KYOTO_VERIFY_SLICE_MS||1000);if(!Number.isInteger(sliceMs)||sliceMs<1||sliceMs>1000)throw Error('Verification slices must be between 1 and 1000 ms');
 return {projectId,port,host:env.PORT?'0.0.0.0':'127.0.0.1',origins,limits,sliceMs,release:env.KYOTO_VERIFIER_RELEASE,
  collision:env.KYOTO_COLLISION_PACK||'.local/browser-physics/station.collision.bin'};
}
