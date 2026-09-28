"""Opt-in Linux font fallback for editable text; never saves the source blend."""
import json
from pathlib import Path
import bpy
from bpy.app.handlers import persistent

@persistent
def restore_available_fonts(_=None):
    replacements=[]
    for old in list(bpy.data.fonts):
        if old.packed_file or not old.filepath or old.filepath=='<builtin>' or Path(bpy.path.abspath(old.filepath)).is_file():
            continue
        path=Path('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc')
        if not path.is_file():raise FileNotFoundError('Install fonts-noto-cjk before loading missing platform fonts')
        new=bpy.data.fonts.load(str(path),check_existing=True)
        count=0
        for curve in bpy.data.curves:
            if not isinstance(curve,bpy.types.TextCurve):continue
            for key in ['font','font_bold','font_italic','font_bold_italic']:
                if getattr(curve,key)==old:setattr(curve,key,new);count+=1
        replacements.append({'original':old.filepath,'replacement':str(path),'textBindings':count,'note':'Different font metrics; inspect edited signs before accepting them.'})
        old.use_fake_user=False
        if old.users==0:bpy.data.fonts.remove(old)
    print('KYOTO_FONT_FALLBACK',json.dumps(replacements,ensure_ascii=False))

bpy.app.handlers.load_post.append(restore_available_fonts)
restore_available_fonts()
