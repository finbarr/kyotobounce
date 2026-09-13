import type {Challenge} from '../types.ts';
export function designGeometry(course:Pick<Challenge,'scoring'|'start'|'goal'|'waypoints'>):string;
