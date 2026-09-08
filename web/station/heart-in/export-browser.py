"""Use the unchanged shared exporter with candidate-only emission support.
The coordinator can retain these source emission values when integrating.
Pass the shared exporter's --source, --layout and --output arguments.
"""
from pathlib import Path
source=Path('tools/export_browser_art.py').resolve()
code=source.read_text()
needle="if alpha<1:m.surface_render_method='DITHERED'"
assert code.count(needle)==1
code=code.replace(needle,needle+"\n if rec.get('emission',0):\n  p.inputs['Emission Color'].default_value=(*(color.get(k,.4) for k in 'rgb'),1)\n  p.inputs['Emission Strength'].default_value=rec['emission']")
exec(compile(code,str(source),'exec'),{'__file__':str(source),'__name__':'__main__'})
