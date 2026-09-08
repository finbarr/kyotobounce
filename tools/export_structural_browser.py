"""Run the station-owned browser exporter with explicit candidate-only paths.
Its source is neither edited nor copied into another maintained exporter.
blender -b --python tools/export_structural_browser.py -- SOURCE LAYOUT OUT
"""
import ast,sys
from pathlib import Path
source,layout,out=map(lambda p:Path(p).resolve(),sys.argv[sys.argv.index('--')+1:])
if out.exists():raise FileExistsError('Use a fresh browser output directory')
textures=layout.parent/'textures'
if not textures.exists():textures.symlink_to(Path(__file__).resolve().parents[1]/'runtime'/'textures',target_is_directory=True)
script=Path(__file__).with_name('export_browser_art.py');tree=ast.parse(script.read_text(),filename=str(script))
replaced=set()
for node in tree.body:
 if isinstance(node,ast.Assign)and len(node.targets)==1 and isinstance(node.targets[0],ast.Name):
  name=node.targets[0].id
  if name in ['SOURCE','LAYOUT','OUT']:
   value={'SOURCE':source,'LAYOUT':layout,'OUT':out}[name]
   node.value=ast.Call(func=ast.Name(id='Path',ctx=ast.Load()),args=[ast.Constant(str(value))],keywords=[]);replaced.add(name)
if replaced!={'SOURCE','LAYOUT','OUT'}:raise RuntimeError('Exporter path contract changed; review wrapper')
# glTF otherwise serializes the entire authoring scene as a second scene,
# including hidden source/dynamic objects that the browser never displays.
for node in ast.walk(tree):
 if isinstance(node,ast.Call) and isinstance(node.func,ast.Attribute) and node.func.attr=='gltf':
  node.keywords.append(ast.keyword(arg='use_active_scene',value=ast.Constant(True)))
ast.fix_missing_locations(tree)
exec(compile(tree,str(script),'exec'),{'__file__':str(script),'__name__':'__main__'})
