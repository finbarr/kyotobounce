"""Encode the sampled full-game moving-camera inspection; requires ffmpeg."""
from pathlib import Path
import os,subprocess,json
c=Path('artifacts/station-detail/plaza-landmarks/candidate');frames=json.loads((c/'movement/cameras.json').read_text())
assert len(frames)==54 and len(list((c/'movement').glob('frame-*.png')))==54
ffmpeg=os.environ.get('FFMPEG','ffmpeg')
subprocess.run([ffmpeg,'-y','-hide_banner','-loglevel','error','-framerate','6','-i',str(c/'movement/frame-%03d.png'),'-c:v','libx264','-crf','20','-pix_fmt','yuv420p',str(c/'inspection.mp4')],check=True)
result=subprocess.run([ffmpeg,'-hide_banner','-i',str(c/'inspection.mp4'),'-f','null','-'],check=True,capture_output=True,text=True)
(c/'movement/video-check.txt').write_text(result.stderr)
print('Encoded and decoded 54 sampled camera frames / 9 seconds. Not a real-time FPS measurement.')
