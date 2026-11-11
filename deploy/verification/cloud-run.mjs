import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifierConfig} from '../../web/online/config.mjs';
// Generate a reviewable service specification; never invoke a provider API.
export function cloudRunService({project,image,origins,service='kyoto-verifier',account='kyoto-verifier'}){
 assert(/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(project||''),'Use a Google Cloud project ID');
 assert(/^[a-z][a-z0-9-]{0,47}[a-z0-9]$/.test(service),'Invalid service name');
 assert(/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(account),'Use a dedicated service account name');
 assert(new RegExp('^[a-z0-9-]+-docker\\.pkg\\.dev/'+project+'/[a-z0-9_-]+/[a-z0-9/_-]+@sha256:[a-f0-9]{64}$').test(image||''),'Pin the verifier image by digest in this project');
 verifierConfig({GOOGLE_CLOUD_PROJECT:project,PORT:'8080',NODE_ENV:'production',KYOTO_ALLOWED_ORIGINS:origins,KYOTO_VERIFIER_RELEASE:'/app/release.json'});
 return {apiVersion:'serving.knative.dev/v1',kind:'Service',metadata:{name:service,annotations:{'run.googleapis.com/ingress':'all','run.googleapis.com/invoker-iam-disabled':'true','run.googleapis.com/minScale':'0','run.googleapis.com/maxScale':'2'}},spec:{
  template:{metadata:{annotations:{'run.googleapis.com/cpu-throttling':'true','run.googleapis.com/startup-cpu-boost':'false','run.googleapis.com/execution-environment':'gen2'}},spec:{
   serviceAccountName:`${account}@${project}.iam.gserviceaccount.com`,containerConcurrency:4,timeoutSeconds:30,
   containers:[{image,ports:[{containerPort:8080}],resources:{limits:{cpu:'1',memory:'1Gi'}},env:[{name:'GOOGLE_CLOUD_PROJECT',value:project},{name:'KYOTO_ALLOWED_ORIGINS',value:origins}],
    startupProbe:{httpGet:{path:'/health',port:8080},periodSeconds:1,timeoutSeconds:1,failureThreshold:30}}]
  }},traffic:[{latestRevision:true,percent:100}]
 }};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const document=cloudRunService({project:process.env.GOOGLE_CLOUD_PROJECT,image:process.env.KYOTO_VERIFY_IMAGE,origins:process.env.KYOTO_ALLOWED_ORIGINS,service:process.env.KYOTO_VERIFY_SERVICE,account:process.env.KYOTO_VERIFY_ACCOUNT});
 const file='.local/verification/cloud-run.json';await mkdir('.local/verification',{recursive:true});await writeFile(file,JSON.stringify(document,null,2)+'\n');console.log(`Prepared ${file}; no deployment performed`);
}
