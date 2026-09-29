"""Compare retained subway geometry with mapped surface anchors; never move assets.

Run with pyproj installed. OSM coordinates are mapping evidence, not survey control.
"""
import argparse
import hashlib
import html
import json
import xml.etree.ElementTree as ET
from pathlib import Path

from pyproj import Transformer

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("manifest", type=Path)
parser.add_argument("osm", type=Path)
parser.add_argument("output", type=Path)
args = parser.parse_args()
assert Path(".local").resolve() in args.output.resolve().parents
sha = lambda data: hashlib.sha256(data).hexdigest()
manifest = json.loads(args.manifest.read_text())
raw = Path(manifest["layout"]).read_bytes()
assert sha(raw) == manifest["layoutSha256"]
layout = json.loads(raw)
frame_path = Path("art-source/station-municipal-frame.json")
frame = json.loads(frame_path.read_text())
project = Transformer.from_crs(4326, frame["projectedEPSG"], always_xy=True)
inverse = Transformer.from_crs(frame["projectedEPSG"], 4326, always_xy=True)
root = ET.fromstring(args.osm.read_bytes())
assert root.tag == "osm" and root.get("version") == "0.6"
nodes = {n.get("id"): n for n in root.findall("node")}


def position(node):
    lon, lat = float(node.get("lon")), float(node.get("lat"))
    x, north = project.transform(lon, lat)
    lon2, lat2 = inverse.transform(x, north)
    assert max(abs(lon2 - lon), abs(lat2 - lat)) < 1e-8
    delta = [x - frame["projectedOriginXY"][0], north - frame["projectedOriginXY"][1]]
    east, north = [sum(a * b for a, b in zip(row, delta)) for row in frame["localXYFromProjectedXY"]]
    return {"x": east, "z": north}


def tags(element):
    return {tag.get("k"): tag.get("v") for tag in element.findall("tag")}


entrances = [
    {"node": n.get("id"), "tags": tags(n), "position": position(n)}
    for n in nodes.values() if tags(n).get("railway") == "subway_entrance"
]
tracks = [
    {"way": w.get("id"), "tags": tags(w), "points": [position(nodes[n.get("ref")]) for n in w.findall("nd")]}
    for w in root.findall("way") if tags(w).get("railway") == "subway"
]
assert {e["tags"].get("ref") for e in entrances} >= {"3", "4"}
assert tracks


def bounds(panel):
    return {axis: [min(v[axis] for v in panel["vertices"]), max(v[axis] for v in panel["vertices"])] for axis in ("x", "y", "z")}


rails = []
for track in (1, 2):
    pair = [next(p for p in layout["panels"] if p["id"] == f"subway-platforms-rail-{track}-{side}-head") for side in (-1, 1)]
    boxes = [bounds(p) for p in pair]
    rails.append({"track": track, "panelIds": [p["id"] for p in pair], "x": sum(sum(b["x"]) / 2 for b in boxes) / 2,
                  "z": [min(b["z"][0] for b in boxes), max(b["z"][1] for b in boxes)]})
lift = next(l for l in layout["lifts"] if l["id"] == "subway-exit-five-lift")
slice_z = 0
mapped_x = []
for track in tracks:
    for a, b in zip(track["points"], track["points"][1:]):
        if min(a["z"], b["z"]) < slice_z < max(a["z"], b["z"]):
            mapped_x.append(a["x"] + (b["x"] - a["x"]) * (slice_z - a["z"]) / (b["z"] - a["z"]))
assert len(mapped_x) == 2
assert all(r["z"][0] < slice_z < r["z"][1] for r in rails)
comparison = {
    "sectionZ": slice_z,
    "mappedTrackCenterX": sorted(mapped_x),
    "currentTrackCenterX": sorted(r["x"] for r in rails),
    "meanEastDisplacementM": sum(r["x"] for r in rails) / 2 - sum(mapped_x) / 2,
    "interpretation": "Coarse discrepancy diagnostic; not an accepted relocation transform or surveyed error.",
}
report = {
    "layoutSha256": sha(raw), "frameSha256": sha(frame_path.read_bytes()), "osmSha256": sha(args.osm.read_bytes()),
    "scriptSha256": sha(Path(__file__).read_bytes()), "axes": "Native X east, Z north; no height inferred from OSM",
    "projection": "WGS84 EPSG:4326 to EPSG:6674, then the retained municipal local matrix; inverse round trip checked",
    "entrances": entrances, "mappedTracks": tracks, "currentTracks": rails, "comparison": comparison,
    "currentExitFive": {k: lift[k] for k in ("id", "origin", "height")},
    "limits": [
        "OSM track ways retain a KSJ2 / MLIT 2007 source tag. They are coarse mapping, not as-built underground survey.",
        "Unnumbered entrance nodes must not be assigned exit numbers without another source.",
        "The street photographs establish the taxi-side context and tiled enclosure, not a precise shaft coordinate.",
        "The geotag of the 2025 stair photograph describes its camera, not the shaft; its position is not accepted as an anchor.",
        "Operator floor maps establish connections and orientation but are diagrammatic; do not fit them as measured plans.",
        "No game asset or coordinate is changed by this audit.",
    ],
}
args.output.mkdir(parents=True, exist_ok=True)
(args.output / "registration.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")

# Draw coordinates without stretching any source to match the current game.
scale, x0, z0, width, height = 4, 10, 150, 920, 860
xy = lambda p: ((p["x"] - x0) * scale, (z0 - p["z"]) * scale)
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}"><rect width="100%" height="100%" fill="#f7f5ef"/>',
       '<style>text{font:13px sans-serif;fill:#222} .small{font-size:11px}</style>',
       '<text x="20" y="25" font-weight="bold">Subway placement audit · native metres · north ↑</text>',
       '<text x="20" y="47">Green: mapped OSM tracks. Red: current game tracks. This is not a relocation plan.</text>']
for x in range(20, 221, 20):
    a, b = xy({"x": x, "z": 135}), xy({"x": x, "z": -30})
    svg.append(f'<path d="M{a[0]},{a[1]}L{b[0]},{b[1]}" stroke="#ddd"/><text x="{a[0]+3}" y="{a[1]+15}" class="small">X{x}</text>')
for z in range(-20, 131, 20):
    a, b = xy({"x": 20, "z": z}), xy({"x": 220, "z": z})
    svg.append(f'<path d="M{a[0]},{a[1]}L{b[0]},{b[1]}" stroke="#ddd"/><text x="{a[0]}" y="{a[1]-3}" class="small">Z{z}</text>')
svg.append('<defs><clipPath id="map"><rect x="40" y="65" width="800" height="660"/></clipPath></defs><g clip-path="url(#map)">')
for track in tracks:
    points = " ".join(f"{x:.2f},{y:.2f}" for x, y in map(xy, track["points"]))
    svg.append(f'<polyline points="{points}" fill="none" stroke="#16865a" stroke-width="3"/>')
for rail in rails:
    a, b = [xy({"x": rail["x"], "z": z}) for z in rail["z"]]
    svg.append(f'<path d="M{a[0]},{a[1]}L{b[0]},{b[1]}" stroke="#bd3c34" stroke-width="4"/>')
for entrance in entrances:
    x, y = xy(entrance["position"])
    label = "Exit " + entrance["tags"]["ref"] if "ref" in entrance["tags"] else "Unnumbered"
    svg.append(f'<circle cx="{x}" cy="{y}" r="5" fill="#16865a"/><text x="{x+8}" y="{y-8}">{html.escape(label)}</text>')
x, y = xy(lift["origin"])
svg.append(f'<rect x="{x-6}" y="{y-6}" width="12" height="12" fill="#bd3c34"/><text x="{x+9}" y="{y-10}">Current Exit 5 lift</text></g>')
svg.extend([
    f'<text x="20" y="766">At Z0: mapped track mean X{sum(mapped_x)/2:.1f}; current game mean X{sum(r["x"] for r in rails)/2:.1f}.</text>',
    '<text x="20" y="790">Sources: OpenStreetMap contributors (ODbL); retained Kyoto City frame; current native layout.</text>',
    '<text x="20" y="814">The 2007-sourced rail mapping needs stronger control before choosing an exact replacement alignment.</text>',
    '</svg>',
])
(args.output / "plan.svg").write_text("\n".join(svg) + "\n")
print(json.dumps(comparison, indent=2))
