"""Make test photos: a landscape JPEG whose EXIF says "rotate 90° CW" (orientation 6), and a fake HEIC.
The browser must show the JPEG upright as a portrait image. Usage: python3 fixtures.py OUT_DIR"""
import struct, subprocess, sys, os

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
raw = os.path.join(out, 'raw.jpg')
# Landscape 1600×1200 with an arrow-like marker in the top-left so orientation is visible.
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'smptebars=size=1600x1200', '-vf',
                'drawbox=x=40:y=40:w=360:h=200:color=red@1:t=fill', '-frames:v', '1', '-q:v', '3', raw], check=True)
data = open(raw, 'rb').read()
assert data[:2] == b'\xff\xd8'
tiff = b'MM\x00\x2a' + struct.pack('>I', 8) + struct.pack('>H', 1) + struct.pack('>HHIHH', 0x0112, 3, 1, 6, 0) + struct.pack('>I', 0)
app1 = b'Exif\x00\x00' + tiff
segment = b'\xff\xe1' + struct.pack('>H', len(app1) + 2) + app1
open(os.path.join(out, 'rotated-landscape.jpg'), 'wb').write(data[:2] + segment + data[2:])
open(os.path.join(out, 'IMG_0001.HEIC'), 'wb').write(b'\x00\x00\x00\x18ftypheic' + os.urandom(2000))
print('ok')
