"""Original painted fired-tile relief; no input art or external asset licenses."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import random,uuid
root=Path(__file__).resolve().parents[1]/'client/Assets/ThronesOfMyth/Resources/Art'
r=random.Random(32032);im=Image.new('RGB',(256,256),(225,)*3);d=ImageDraw.Draw(im)
for row in range(8):
 for col in range(8):
  x=col*32;y=row*32;shade=r.randrange(207,239)
  d.rectangle((x+1,y+1,x+30,y+30),fill=(shade,)*3)
  d.line((x+1,y+29,x+30,y+29),fill=(163,)*3,width=2)
  d.line((x+2,y+2,x+2,y+26),fill=(245,)*3,width=2)
  for stroke in range(7):
   sx=x+r.randrange(3,29);sy=y+r.randrange(3,27);v=shade+r.randrange(-6,7);d.line((sx,sy,sx,sy+3),fill=(v,)*3)
im=im.filter(ImageFilter.GaussianBlur(.45));path=root/'RoofTiles.png';im.save(path)
Path(str(path)+'.meta').write_text('fileFormatVersion: 2\nguid: '+uuid.uuid5(uuid.NAMESPACE_URL,'ThronesOfMyth/RoofTiles').hex+'\nTextureImporter:\n  mipmaps:\n    enableMipMap: 1\n  textureType: 0\n  maxTextureSize: 256\n  textureSettings:\n    filterMode: 1\n    aniso: 4\n    wrapU: 0\n    wrapV: 0\n')
