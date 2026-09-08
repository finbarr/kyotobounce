"""Inspect remaining text objects/font dependencies without changing the source."""
import bpy,json,sys
from pathlib import Path
source,out=map(Path,sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.open_mainfile(filepath=str(source.resolve()))
texts=[]
for o in bpy.context.scene.objects:
    if o.type=='FONT':texts.append({'object':o.name,'body':o.data.body,'hiddenRender':o.hide_render,'font':o.data.font.filepath,'fontPacked':bool(o.data.font.packed_file),'fontExists':Path(bpy.path.abspath(o.data.font.filepath)).exists()})
fonts=[{'name':f.name,'users':f.users,'path':f.filepath,'packed':bool(f.packed_file)}for f in bpy.data.fonts]
report={'source':str(source),'textObjects':texts,'fonts':fonts,'exportRule':'Shared browser exporter exports MESH objects only; unchanged mesh-byte audit establishes browser-label preservation.'}
out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
