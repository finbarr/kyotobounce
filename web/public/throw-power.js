// The meter is linear in release speed. Separate ranges retain gentle banks
// without hiding an extra boost in the last part of the windup.
export const THROW_MODEL='robot-v4';
export function throwSpeed(power,range='full',model=THROW_MODEL){
  const p=Math.max(0,Math.min(1,power));
  if(model===THROW_MODEL)return .5+((range==='precision'?12:100)-.5)*p;
  throw new Error('Unsupported throw model');
}
export function powerForSpeed(speed,range='full'){
  return Math.max(0,Math.min(1,(speed-.5)/((range==='precision'?12:100)-.5)));
}
