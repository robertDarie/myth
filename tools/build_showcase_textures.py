"""Original deterministic brushwork for Thrones of Myth; no source images/dependencies beyond Pillow."""
from pathlib import Path
import random, math, uuid
from PIL import Image, ImageDraw, ImageFilter
root=Path(__file__).resolve().parents[1]/'client/Assets/ThronesOfMyth/Resources/Art'
r=random.Random(31031)
for name,base,contrast in [('MythBrushwork',230,14),('MeadowDetail',128,12)]:
    im=Image.new('RGB',(256,256),(base,)*3);d=ImageDraw.Draw(im)
    for i in range(4200):
        x,y=r.randrange(256),r.randrange(256);v=max(0,min(255,base+r.randrange(-contrast,contrast+1)))
        d.line((x,y,x+r.randrange(3,17),y+r.randrange(-3,4)),fill=(v,v,v),width=r.randrange(1,4))
    im=im.filter(ImageFilter.GaussianBlur(.55));path=root/(name+'.png');im.save(path)
    guid=uuid.uuid5(uuid.NAMESPACE_URL,str(path.relative_to(root.parents[4]))).hex
    Path(str(path)+'.meta').write_text('fileFormatVersion: 2\nguid: '+guid+'\nTextureImporter:\n  mipmaps:\n    enableMipMap: 1\n  textureType: 0\n  maxTextureSize: 256\n  textureSettings:\n    filterMode: 1\n    aniso: 4\n    wrapU: 0\n    wrapV: 0\n')
