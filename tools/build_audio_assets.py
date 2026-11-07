"""Original synthesized sound layers, no third-party recordings or libraries."""
from pathlib import Path
import math,random,wave,struct,json
root=Path(__file__).resolve().parent.parent;out=root/'client/Assets/ThronesOfMyth/Resources/Audio';out.mkdir(parents=True,exist_ok=True);rate=22050
specs={'Footstep':.18,'HorseHoof':.30,'BowRelease':.22,'MetalImpact':.28,'DivineCast':.55,'CityAmbience':8.0};report=[]
for name,duration in specs.items():
 rng=random.Random(1701);samples=[];low=0
 for i in range(int(rate*duration)):
  t=i/rate;f=t/duration;n=rng.uniform(-1,1);low=low*.94+n*.06
  if name=='CityAmbience':
   bird=math.sin(2*math.pi*(1600*t+90*math.sin(t*7)))*max(0,math.sin(t*1.2))**18*.015
   v=low*.12+bird
  else:
   env=min(1,f*35)*math.exp(-f*6)
   if name=='Footstep':v=(math.sin(2*math.pi*95*t)*.28+low*.8+n*.10)*env
   elif name=='HorseHoof':
    beat=(t%.14)/.14;v=(math.sin(2*math.pi*150*t)*.32+n*.12)*min(1,beat*35)*math.exp(-beat*8)
   elif name=='BowRelease':v=(math.sin(2*math.pi*(250*t-240*t*t))*.23+n*.13)*env
   elif name=='MetalImpact':v=(math.sin(2*math.pi*1250*t)*.17+math.sin(2*math.pi*1777*t)*.10+n*.15+low*.3)*env
   else:v=(math.sin(2*math.pi*330*t)*.17+math.sin(2*math.pi*495*t)*.13+math.sin(2*math.pi*660*t)*.07)*math.sin(math.pi*f)**2
  samples.append(max(-.95,min(.95,v)))
 if name=='CityAmbience':
  for i in range(500):samples[i]*=i/500;samples[-i-1]*=i/500
 path=out/(name+'.wav')
 with wave.open(str(path),'wb')as w:w.setparams((1,2,rate,0,'NONE','not compressed'));w.writeframes(b''.join(struct.pack('<h',round(v*32767))for v in samples))
 with wave.open(str(path),'rb')as w:assert w.getnframes()==len(samples)and w.getframerate()==rate
 peak=max(abs(v)for v in samples);assert peak<1
 report.append({'asset':path.name,'seconds':duration,'rate':rate,'peak':round(peak,4)})
(root/'docs/art/audio-validation-0.17.json').write_text(json.dumps(report,indent=2))
print('Built and checked',len(report),'original PCM WAV assets')
