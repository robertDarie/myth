"""Original short skill cues, deterministic additive synthesis; no sampled audio."""
from pathlib import Path
import math,random,struct,wave,uuid
root=Path(__file__).resolve().parents[1]/'client/Assets/ThronesOfMyth/Resources/Audio'
for name in ['RenewalChime','HuntressFlight','CrescentImpact']:
 rng=random.Random(33033);rate=22050;duration=.6;frames=[]
 for i in range(int(rate*duration)):
  t=i/rate;u=t/duration;noise=rng.random()*2-1;env=min(1,t*65)*math.exp(-u*5)
  if name=='RenewalChime':tone=sum(math.sin(2*math.pi*f*t)*a for f,a in [(440,.20),(660,.13),(880,.08)])
  elif name=='HuntressFlight':tone=noise*.22*(1-u)+math.sin(2*math.pi*(1200*t-650*t*t))*.06
  else:tone=noise*.12+math.sin(2*math.pi*(150*t+180*t*t))*.20+math.sin(2*math.pi*420*t)*.08
  frames.append(struct.pack('<h',int(max(-1,min(1,tone*env))*.8*32767)))
 path=root/(name+'.wav')
 with wave.open(str(path),'wb') as out:out.setnchannels(1);out.setsampwidth(2);out.setframerate(rate);out.writeframes(b''.join(frames))
 Path(str(path)+'.meta').write_text('fileFormatVersion: 2\nguid: '+uuid.uuid5(uuid.NAMESPACE_URL,'ThronesOfMyth/Audio/'+name).hex+'\nAudioImporter:\n  forceToMono: 1\n  preloadAudioData: 1\n')
