"""Source-derived plan diagram of covered/retained soffit polygons after frontage clipping."""
import json, sys, math
from pathlib import Path
mask=json.loads(Path(sys.argv[1]).read_text()); out=Path(sys.argv[2])
assert out.resolve().is_relative_to(Path('.local').resolve())
def clip(poly,axis,value,sign):
    result=[]
    for a,b in zip(poly,poly[1:]+poly[:1]):
        da=(a[axis]-value)*sign; db=(b[axis]-value)*sign
        if da>=0: result.append(a)
        if (da>0 and db<0) or (da<0 and db>0):
            t=da/(da-db);result.append([a[k]+(b[k]-a[k])*t for k in range(3)])
    return result

def area(poly):
    value=0
    for i in range(1,len(poly)-1):
        a=[poly[i][k]-poly[0][k] for k in range(3)];b=[poly[i+1][k]-poly[0][k] for k in range(3)]
        value+=math.sqrt(sum((a[(k+1)%3]*b[(k+2)%3]-a[(k+2)%3]*b[(k+1)%3])**2 for k in range(3)))/2
    return value
parts=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 660" role="img" aria-labelledby="title desc"><title id="title">Imported inner-roof mask</title><desc id="desc">Plan projection of the removed overlap in red and retained source transition in green, shown separately for the western and eastern frontage cuts.</desc><rect width="1200" height="660" fill="#f3f5f3"/><g font-family="sans-serif" fill="#183138"><text x="30" y="40" font-size="26">Imported soffit: covered overlap and retained transition</text><text x="30" y="70" font-size="15">Plan projection; independent scale per panel. Colors describe source-mask coverage, not materials.</text>']
stats=[]
for side,(name,lo,hi) in enumerate([('West',-169.477757,-52.4),('East',39,125)]):
    polygons=[]
    for row in mask['rows']:
        for kind in ['covered','remaining']:
            for p in row[kind]:
                poly=p['points']
                for axis,value,sign in [(0,lo,1),(0,hi,-1),(2,-18,-1),(1,0,1)]:poly=clip(poly,axis,value,sign)
                if len(poly)>=3 and area(poly)>1e-10:polygons.append((kind,row['face'],poly))
    points=[p for _,_,poly in polygons for p in poly];xmin,xmax=min(p[0] for p in points),max(p[0] for p in points);zmin,zmax=min(p[2] for p in points),max(p[2] for p in points)
    scale=min(500/(xmax-xmin),400/(zmax-zmin));left=40+side*600;top=140
    xy=lambda p:(left+250+(p[0]-(xmin+xmax)/2)*scale,top+200+(p[2]-(zmin+zmax)/2)*scale)
    removed=sum(area(p) for k,_,p in polygons if k=='covered');retained=sum(area(p) for k,_,p in polygons if k=='remaining');stats.append({'side':name,'removedM2':removed,'retainedM2':retained})
    parts.append(f'<text x="{left}" y="115" font-size="21">{name}: {removed:.3f} m² removed</text>')
    for kind,face,poly in polygons:
        ps=' '.join(f'{x:.3f},{y:.3f}' for x,y in map(xy,poly));color='#d97860' if kind=='covered' else '#59aa89'
        parts.append(f'<polygon points="{ps}" fill="{color}" stroke="#173a41" stroke-width="0.25"><title>Source face {face}: {kind}, {area(poly):.6f} m²</title></polygon>')
    parts.append(f'<text x="{left}" y="565" font-size="14">Renderer X {xmin:.3f} to {xmax:.3f} m; Z {zmin:.3f} to {zmax:.3f} m</text>')
parts.append('<rect x="30" y="595" width="18" height="18" fill="#d97860"/><text x="57" y="610" font-size="15">Removed overlap</text><rect x="240" y="595" width="18" height="18" fill="#59aa89"/><text x="267" y="610" font-size="15">Retained source</text><text x="30" y="642" font-size="14">Adjoining walls are excluded from this diagram and retained in the model. Kyoto City geometry, CC BY 4.0; modified study.</text></g></svg>')
assert abs(sum(s['removedM2'] for s in stats)-67.88925188)<.001
out.parent.mkdir(parents=True,exist_ok=True);out.write_text(''.join(parts)+'\n');print(json.dumps(stats))
