"""Conservative source-derived local boxes; bounds remain within each occupied metre bin."""
import json
from pathlib import Path
result={}
for name in ['kestrel','mule','comet','spectre']:
    source=json.loads(Path('assets/source/plane-'+name+'.voxel.json').read_text());bins={}
    for cell in source['cells']:
        p=cell['position'];key=tuple(n//10 for n in p)
        if key not in bins:bins[key]=[p[:],p[:]]
        lo,hi=bins[key]
        for a in range(3):lo[a]=min(lo[a],p[a]);hi[a]=max(hi[a],p[a]+1)
    boxes=[]
    for lo,hi in bins.values():
        center=[(lo[a]+hi[a])*.05 for a in range(3)];center[0]-=source['size'][0]*.05;center[1]-=2.4;center[2]-=source['size'][2]*.05
        boxes.append([round(n,4) for n in center+[(hi[a]-lo[a])*.1 for a in range(3)]])
    result[name]=boxes
Path('src/flight/roster-hulls.ts').write_text("// Derived from plane-*.voxel.json via tools/assets/build-roster-hulls.py.\nimport {prepareHull,type Hull,type CollisionBox} from './collision';\nimport {PLAYER_FIXED_HULL} from './aircraft-hulls';\nimport type {PlaneId} from '../game/aircraft-roster';\nconst boxes="+json.dumps(result,separators=(',',':'))+" as const;\nconst cache=new Map<PlaneId,Hull>();\nexport function planeHull(id:PlaneId){if(id==='frontier')return PLAYER_FIXED_HULL;let hull=cache.get(id);if(!hull){hull=prepareHull(boxes[id] as readonly CollisionBox[]);cache.set(id,hull);}return hull;}\n")
