"""Author original v1 occupancy sources at 0.1 m; sources remain geometry authority."""
import json,math
from pathlib import Path
PALETTE={'skin':'#889883','light':'#c4c6ae','shade':'#54685e','glass':'#294b59','frame':'#839da0','stripe':'#c9a45b','dark':'#242c2c','steel':'#737d7a','red':'#bd5141','green':'#789e62','prop':'#3b4140','panel':'#667870'}
def make(kind,name,span,length):
    cells={};sx=int(span*10);sz=int(length*10);sy=64
    def put(x,y,z,c):
        i,j,k=round(x*10+sx/2-.5),round(y*10-.5),round(z*10+sz/2-.5)
        if 0<=i<sx and 0<=j<sy and 0<=k<sz:cells[(i,j,k)]=c
    def box(x,y,z,w,h,d,c):
        for i in range(math.floor((x-w/2)*10),math.ceil((x+w/2)*10)):
            for j in range(math.floor((y-h/2)*10),math.ceil((y+h/2)*10)):
                for k in range(math.floor((z-d/2)*10),math.ceil((z+d/2)*10)):put((i+.5)/10,(j+.5)/10,(k+.5)/10,c)
    def ell(x,y,z,rx,ry,rz,c):
        for i in range(math.floor((x-rx)*10),math.ceil((x+rx)*10)):
            for j in range(math.floor((y-ry)*10),math.ceil((y+ry)*10)):
                for k in range(math.floor((z-rz)*10),math.ceil((z+rz)*10)):
                    if (((i+.5)/10-x)/rx)**2+(((j+.5)/10-y)/ry)**2+(((k+.5)/10-z)/rz)**2<=1:put((i+.5)/10,(j+.5)/10,(k+.5)/10,c)
    prop=kind in ['kestrel','mule'];twin=kind=='mule';advanced=kind=='spectre'
    # Sculpted tapered fuselage; structural surfaces are hollowed after authoring.
    bodylen=length*.89
    for k in range(int(-bodylen*5),int(bodylen*5)):
        z=(k+.5)/10;t=(z+bodylen/2)/bodylen
        r=(.55 if kind=='kestrel' else .8 if twin else .87 if not advanced else 1.05)*min(1,.22+math.sin(math.pi*t)*1.2)
        yc=2.35
        ell(0,yc,z,r,r*.82,.09,'light' if prop else 'skin')
    canopyz=-1.3 if prop else -3
    ell(0,2.9,canopyz,.62 if not twin else .76,.85,1.1 if prop else 1.65,'glass')
    for z in [canopyz-1,canopyz,canopyz+1]:box(0,3.45,z,1.3 if not twin else 1.5,.09,.1,'frame')
    box(0,3.6,canopyz,.1,.13,2.2 if prop else 3,'frame')
    wingy=3.05 if kind=='kestrel' else 2.35
    for side in [-1,1]:
        for i in range(5,int(span*5)-2):
            x=side*(i+.5)/10;t=abs(x)/(span/2)
            chord=(1.7 if kind=='kestrel' else 2.35 if twin else 3.3 if not advanced else 5)*(1-t*.58)
            sweep=.4 if prop else 3.2 if not advanced else 5.4
            z=-.6+t*sweep
            box(x,wingy,z,.1,.18 if prop else .2,chord,'light' if prop else 'skin')
            box(x,wingy+.12,z+chord*.34,.1,.05,.07,'shade')
            if i%12==0:box(x,wingy+.12,z,.08,.04,chord*.8,'panel')
            if .68<t<.75:box(x,wingy+.14,z,.1,.05,chord,'stripe')
        tip=side*(span/2-.25);box(tip,wingy+.22,4.6 if advanced else -.15 if prop else 2.3,.16,.45,.7,'red' if side<0 else 'green')
        # Tailplanes and swept vertical fins, separate silhouettes per tier.
        tail=length*.35;tailspan=2.1 if prop else 2.6 if not advanced else 3.8
        for i in range(1,int(tailspan*10)):
            x=side*(i+.5)/10;box(x,2.7,tail+abs(x)*.32,.1,.15,1.3*(1-abs(x)/tailspan*.55),'light' if prop else 'skin')
        finx=side*1.8 if advanced else 0
        if side==1 or advanced:
            for j in range(18):box(finx+side*j*.018 if advanced else 0,2.85+j*.1,tail+j*.038,.15,.1,1.65-j*.055,'skin')
        # Wheel hubs, tires, gear oleos, pylons and gun barrels.
        gx=side*(1.25 if kind=='kestrel' else 2.2)
        box(gx,1.1,.4,.16,1.7,.16,'steel');ell(gx,.35,.4,.22,.35,.35,'dark');box(gx+side*.23,.35,.4,.08,.2,.2,'steel')
        for zz in [-.5,.1,.7]:box(gx,1.6,zz,.35,.12,.18,'steel')
        if not prop:
            for x in [side*3,side*4.5]:box(x,1.95,.9,.2,.65,.9,'shade');ell(x,1.55,.2,.18,.18,1.45,'light');box(x,1.55,-1.25,.18,.18,.2,'stripe')
            box(side*.6,2.12,-length*.33,.18,.18,1.9,'dark')
        # Maintenance panels, exhaust vents, wing root fairings, national stripes.
        for z in [0,1,2,3]:box(side*(.55 if prop else .85),2.55,z,.1,.32,.65,'panel')
        for z in [1,1.3,1.6,1.9]:box(side*(.58 if prop else .88),2.35,z,.1,.4,.08,'dark')
    box(0,.95,-length*.27,.16,1.3,.16,'steel');ell(0,.35,-length*.27,.18,.3,.3,'dark')
    if prop:
        engines=[-3.4,3.4] if twin else [0]
        for x in engines:
            z=-2.3 if twin else -length*.41
            if twin:ell(x,2.3,z+1,.48,.5,1.7,'shade')
            else:box(0,2.35,z+.25,1,1,.65,'shade')
            ell(x,2.35,z-.2,.25,.25,.45,'steel')
            # Four asymmetric-length blade tips around each original propeller hub.
            box(x,2.35,z-.5,.12,2.5,.1,'prop');box(x,2.35,z-.5,2.5,.12,.1,'prop')
            box(x,3.5,z-.5,.2,.18,.1,'stripe');box(x,1.2,z-.5,.2,.18,.1,'stripe')
        if not twin:
            for side in [-1,1]:
                for j in range(16):box(side*(.5+j*.19),2+j*.065,-.2,.1,.15,.15,'steel')
        # Door seams, hinges, handles and under-wing gun pods.
        for side in [-1,1]:
            box(side*.6,2.6,-.5,.1,1.1,.08,'shade');box(side*.64,2.65,-.75,.1,.08,.27,'steel')
            box(side*2.2,wingy-.5,-.1,.25,.3,1.7,'shade');box(side*2.2,wingy-.5,-1.2,.1,.1,.7,'dark')
    elif advanced:
        for side in [-1,1]:
            ell(side*.9,2.15,3.3,.62,.62,3.9,'shade')
            ell(side*.9,2.15,6.8,.5,.5,.7,'steel');ell(side*.9,2.15,7.3,.37,.37,.1,'dark')
            box(side*1.6,2.3,-2.5,.7,.65,1.4,'dark')
            for i in range(24):box(side*(1+i*.07),2.9,-3+i*.022,.1,.12,1.1-i*.025,'skin')
            for i in range(7):box(side*.9,2.7,5.2+i*.18,.85,.1,.06,'steel')
        box(0,1.65,.1,.6,.12,3,'dark');box(0,1.56,.1,.8,.1,2.7,'panel')
    else:
        ell(0,2.35,-length*.44,.65,.65,.3,'steel');ell(0,2.35,-length*.46,.46,.46,.12,'dark')
        ell(0,2.35,length*.38,.65,.65,1,'steel');ell(0,2.35,length*.44,.47,.47,.1,'dark')
        for side in [-1,1]:box(side*.7,2.4,-1.6,.15,.65,1.2,'shade')
    # Remove enclosed occupancy while preserving the authored visible surfaces.
    solid=set(cells);cells={p:c for p,c in cells.items() if any((p[0]+a,p[1]+b,p[2]+d) not in solid for a,b,d in [(1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1)])}
    # Fine colored fasteners and access seams on existing skin, no random geometry.
    for (i,j,k),c in list(cells.items()):
        if c in ['skin','light'] and i%13==0 and k%17==0:cells[(i,j,k)]='steel'
    assert len(cells)<=32768,(kind,len(cells))
    asset=dict(schemaVersion=1,id='plane-'+kind,name=name,category='aircraft',units='metres',voxelSize=.1,size=[sx,sy,sz],pivot='base-center',orientation={'up':'+Y','front':'-Z'},palette=[dict(id=k,color=v,material='matte') for k,v in PALETTE.items()],cells=[dict(position=list(p),palette=c) for p,c in sorted(cells.items())],tags=['aircraft','progression',kind],provenance='Original Micro Voxel World aircraft, authored as explicit 0.1 m occupancy; no third-party model.')
    Path('assets/source/plane-'+kind+'.voxel.json').write_text(json.dumps(asset,separators=(',',':'))+'\n');print(kind,len(cells))
for params in [('kestrel','Kestrel S-1',11.8,9.6),('mule','Mule T-2',16.8,12.8),('comet','Comet J-3',12.8,14.8),('spectre','Spectre X-5',16.8,19.8)]:make(*params)
