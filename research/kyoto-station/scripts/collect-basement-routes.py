"""Collect the operator's basement route references without replacing prior files."""
import hashlib
import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOST = "https://www.kyoto-station-building.co.jp"
PARENT = HOST + "/directions/"
RIGHTS = "Copyright Kyoto Station Building. Research reference only; no game texture or redistribution permission established."

def main():
    rows = json.loads((ROOT / "sources.json").read_text())
    known = {row["id"] for row in rows}
    sources = [
        ("official-directions", "Official station route directions", PARENT,
         "pages/official-directions.html", "context", "html",
         "Operator route text identifies the central-concourse escalator destination as B2F, then Porta south area and the subway. Includes official 360-degree route video embeds."),
        *[(f"official-floor-{floor}", f"Official {floor.upper()} station map",
           HOST + f"/app/themes/kyoto-station-building/floorguide/img/map/img_map_{floor}.svg",
           f"maps/floor-{floor}.svg", "maps", "svg",
           "Operator floor-guide schematic. Establishes adjacency and level labels; not a metric construction drawing. URL resolved from the saved official floor-map JavaScript.")
          for floor in ("b1", "b2")],
        *[(f"official-basement-route-{step}", f"Central concourse to subway, route photograph {step}",
           HOST + f"/app/themes/kyoto-station-building/directions/img/img_route_navi1_aa_0{step}.jpg",
           f"photos/official-basement-route-{step}.jpg", "photos", "jpg",
           ["Central concourse escalator entrance, labelled B2F in accompanying route text.",
            "Lower landing and Porta south-area corridor.",
            "Arrival at the subway station."][step - 1]) for step in (1, 2, 3)]
    ]
    for ident, title, url, filename, category, fmt, note in sources:
        if ident in known:
            continue
        path = ROOT / filename
        if path.exists():
            raise RuntimeError(f"Uncatalogued file already exists: {path}")
        with urllib.request.urlopen(url, timeout=40) as response:
            data = response.read()
            content_type = response.headers.get_content_type()
            final_url = response.url
        assert data and content_type in {"text/html", "image/svg+xml", "image/jpeg"}, content_type
        path.write_bytes(data)
        rows.append(dict(id=ident, title=title, url=url, parent_url=PARENT if category != "maps" else HOST + f"/floorguide/{ident[-2:]}/",
                         publisher="Kyoto Station Building Development Co., Ltd.", category=category,
                         format=fmt, source_date="Current operator page; individual photograph/drawing date unlisted",
                         rights=RIGHTS, note=note, inspection="Awaiting individual visual inspection",
                         status="downloaded", local_file=filename, bytes=len(data),
                         sha256=hashlib.sha256(data).hexdigest(), content_type=content_type,
                         final_url=final_url, retrieved_at=datetime.now(timezone.utc).isoformat()))
        (ROOT / "sources.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n")
        print(ident, len(data), content_type)
    if "official-basement-360" not in known:
        rows.append(dict(id="official-basement-360", title="Official 360-degree route: central concourse to subway",
                         url="https://www.youtube.com/watch?v=4q92JI4JhRM", parent_url=PARENT,
                         publisher="Kyoto Station Building", category="videos", format="video",
                         source_date="Video publication/capture date unverified",
                         rights=RIGHTS, status="link-only",
                         note="Official directions page embeds this 360-degree video for the central-concourse to B2F Porta/subway route. Indexed as a route reference; no video downloaded.",
                         inspection="Embed identity and accompanying directions checked; playback not inspected"))
        (ROOT / "sources.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n")

if __name__ == "__main__":
    main()
