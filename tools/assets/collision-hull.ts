import { readFileSync } from 'node:fs';
import { voxelCollisionBoxes } from '../../src/assets/collision-hull.ts';
const source=JSON.parse(readFileSync('assets/source/ref-attack-aircraft.voxel.json','utf8'));
process.stdout.write("// Generated from ref-attack-aircraft.voxel.json, rendered pivot y=-2.4.\n// Regenerate: node tools/assets/collision-hull.ts > src/flight/attack-aircraft-hull.ts\nimport type { CollisionBox } from './collision.ts';\nexport const ATTACK_AIRCRAFT_BOXES:readonly CollisionBox[]="+JSON.stringify(voxelCollisionBoxes(source,-2.4),null,0).replace(/\],\[/g,'],\n[')+";\n");
