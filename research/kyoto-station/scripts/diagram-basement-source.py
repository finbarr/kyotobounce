"""Derive auditable floor outlines from immutable municipal triangles. Requires Shapely."""
import hashlib
import json
from pathlib import Path
from shapely import set_precision
from shapely.geometry import Polygon, box, mapping
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "notes/central-hall-basement"
raw = (OUT / "source-triangles.json").read_bytes()
source = json.loads(raw)
clip = box(-16, -10, 18, 3)
levels = {"main_floor": .03658, "curb": .136588, "lower_deck": -4.877, "lower_landings": -4.9269}
results = {}
geometries = {}
for name, height in levels.items():
    faces = [t for t in source["triangles"] if t["object"] == "Untitled.200" and t["normal"][1] > .99
             and all(abs(v[1] - height) < .001 for v in t["vertices"])]
    polygons = [set_precision(Polygon([(v[0], v[2]) for v in t["vertices"]]), 1e-5) for t in faces]
    geometry = unary_union(polygons).intersection(clip)
    assert geometry.is_valid and geometry.area > 0
    parts = [geometry] if geometry.geom_type == "Polygon" else list(geometry.geoms)
    holes = sorted([Polygon(ring) for part in parts for ring in part.interiors], key=lambda p: p.centroid.x)
    geometries[name] = geometry
    results[name] = dict(nominalSourceY=height, selectionToleranceMetres=.001, sourceFaces=len(faces),
                         area=geometry.area, geometry=mapping(geometry), holes=[dict(area=p.area, bounds=p.bounds,
                         geometry=mapping(p)) for p in holes],
                         sourceFaceIds=[dict(primitive=t["primitive"], face=t["face"]) for t in faces])
assert len(results["main_floor"]["holes"]) == 3
assert len(results["curb"]["holes"]) == 1
assert len(results["lower_deck"]["holes"]) == 2
assert abs(geometries["main_floor"].area + sum(h["area"] for h in results["main_floor"]["holes"]) - clip.area) < 1e-6

steps = {}
for name, obj in [("west", "BuildingInstallation.1541"), ("east", "BuildingInstallation.2070")]:
    faces = [t for t in source["triangles"] if t["object"] == obj and t["normal"][1] > .99]
    groups = {}
    for t in faces:
        height = round(sum(v[1] for v in t["vertices"]) / 3, 4)
        groups.setdefault(height, []).append(t)
    steps[name] = dict(object=obj, horizontalFaceCount=len(faces), levels=[dict(y=y, faces=len(ts), area=sum(t["area"] for t in ts)) for y, ts in sorted(groups.items())])

receipt = dict(sourceSha256=source["sourceSha256"], triangleInventorySha256=hashlib.sha256(raw).hexdigest(),
               sourceVerticalExtent=source["sourceVerticalExtent"], clipXZ=[-16, -10, 18, 3],
               precisionMetres=1e-5, coordinates=source["coordinates"],
               limits="Source mesh dimensions, not surveyed accuracy. Floor names are geometric descriptions; lower deck not assigned B1F/B2F. The complete source stops above -5 m. Route destination B2F does not establish first-landing datum.",
               levels=results, escalatorSteps=steps, checks=dict(validPolygons=True, mainFloorHoleCount=3, curbHoleCount=1, lowerDeckHoleCount=2, mainFloorAreaConservation=True))
(OUT / "floor-topology.json").write_text(json.dumps(receipt, indent=2) + "\n")

def path(geometry):
    parts = [geometry] if geometry.geom_type == "Polygon" else list(geometry.geoms)
    rings = [ring for p in parts for ring in [p.exterior, *p.interiors]]
    return " ".join("M " + " L ".join(f"{(x+16)*28+40:.3f},{(z+10)*28+85:.3f}" for x,z in r.coords) + " Z" for r in rings)

svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="1080" viewBox="0 0 1040 1080">',
       '<rect width="1040" height="1080" fill="#f5f3ed"/>',
       '<style>text{font-family:Arial,sans-serif;fill:#263b37} .title{font-size:25px;font-weight:bold}.small{font-size:16px}</style>',
       '<text x="40" y="35" class="title">Central hall basement openings · municipal source</text>',
       '<text x="40" y="64" class="small">Plan view. North is up; X east →. Source coordinates in metres, not survey dimensions.</text>',
       f'<path d="{path(geometries["main_floor"])}" fill="#ddd6c5" fill-rule="evenodd" stroke="#7c796e" stroke-width="1"/>',
       f'<path d="{path(geometries["curb"])}" fill="#5b8b87" fill-rule="evenodd" stroke="#315e5a" stroke-width="1"/>']
for i,hole in enumerate(results["main_floor"]["holes"]):
    a,b,c,d = hole["bounds"]
    x=((a+c)/2+16)*28+40
    svg.append(f'<text x="{x}" y="405" text-anchor="middle" class="small">{["West", "Central oval", "East"][i]}: {hole["area"]:.2f} m²</text>')
svg.extend(['<text x="40" y="480" class="small">Sand: main floor Y≈0.0366. Teal: source curb top Y≈0.1366.</text>',
            '<text x="40" y="506" class="small">Unfilled regions: three openings in this floor layer; purpose of central oval unresolved.</text>',
            '<g transform="translate(0,510)">',
            f'<path d="{path(geometries["lower_deck"])}" fill="#dce5dd" fill-rule="evenodd" stroke="#658276" stroke-width="1"/>',
            f'<path d="{path(geometries["lower_landings"])}" fill="#c4d4ca" fill-rule="evenodd" stroke="#658276" stroke-width="1"/>'])
for t in source["triangles"]:
    if t["object"] in ["BuildingInstallation.1541", "BuildingInstallation.2070"] and t["normal"][1]>.99:
        p=Polygon([(v[0],v[2]) for v in t["vertices"]]).intersection(clip)
        if p.area: svg.append(f'<path d="{path(p)}" fill="#899cad" stroke="#324c60" stroke-width=".65"/>')
svg.extend(['</g>', '<text x="40" y="975" class="small">Lower deck Y≈−4.8770; adjacent landing faces Y≈−4.9269. Blue: source treads.</text>',
            '<text x="40" y="1002" class="small">Operator route ends on B2F. Recent photo labels nearer well B1F; first-landing identity unverified.</text>',
            '<text x="40" y="1029" class="small">Kyoto City model, CC BY 4.0. Derived outlines; no new game geometry or collision.</text>',
            '<path d="M 40 1055 h 140 m -140 -5 v 10 m 140 -10 v 10" stroke="#263b37"/>',
            '<text x="195" y="1062" class="small">5 source metres</text>', '</svg>'])
(OUT / "floor-topology.svg").write_text("\n".join(svg))
print(json.dumps({name: {"area": r["area"], "holes": len(r["holes"]), "faces":r["sourceFaces"]} for name,r in results.items()}, indent=2))
