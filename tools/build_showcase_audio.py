"""Original synthesized Rallying Cry layers. No samples or third-party recordings."""
from pathlib import Path
import math, random, struct, wave, uuid
root=Path(__file__).resolve().parents[1]/'client/Assets/ThronesOfMyth/Resources/Audio'
for name,duration in [('RallyCharge',.32),('RallyRelease',.72)]:
    rng=random.Random(31031);rate=22050;data=[]
    for i in range(int(rate*duration)):
        t=i/rate;u=t/duration
        if name=='RallyCharge':
            env=math.sin(math.pi*u)**.7
            sample=(math.sin(2*math.pi*(180*t+460*t*t))*.32+math.sin(2*math.pi*540*t)*.12+(rng.random()*2-1)*.04)*env
        else:
            env=min(1,t*80)*math.exp(-5*u)
            sample=(math.sin(2*math.pi*110*t)*.23+math.sin(2*math.pi*330*t)*.18+math.sin(2*math.pi*495*t)*.10+(rng.random()*2-1)*.12*(1-u))*env
        data.append(struct.pack('<h',int(max(-1,min(1,sample))*.8*32767)))
    path=root/(name+'.wav')
    with wave.open(str(path),'wb') as out:out.setnchannels(1);out.setsampwidth(2);out.setframerate(rate);out.writeframes(b''.join(data))
    Path(str(path)+'.meta').write_text('fileFormatVersion: 2\nguid: '+uuid.uuid5(uuid.NAMESPACE_URL,'ThronesOfMyth/Audio/'+name).hex+'\nAudioImporter:\n  forceToMono: 1\n  preloadAudioData: 1\n')
