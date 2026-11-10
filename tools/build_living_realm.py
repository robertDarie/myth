"""Original settlement/woodland kit; Blender -b --python tools/build_living_realm.py.
Reuses our civic proportions/materials, no external geometry or textures.
"""
import bpy,math,os,sys,json
from mathutils import Vector
sys.path.insert(0,os.path.dirname(__file__))
import build_greek_districts as k
for name,col in {'Green':(.25,.40,.19,1),'LeafLight':(.39,.50,.25,1),'LeafDark':(.18,.30,.16,1),'Bark':(.29,.20,.13,1)}.items():
 m=bpy.data.materials.new(name);m.diffuse_color=col;k.mats[name]=m
rows=[]
def start():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);k.parts.clear()
def save(name):
 bpy.ops.object.select_all(action='DESELECT')
 for o in k.parts:o.select_set(True)
 bpy.context.view_layer.objects.active=k.parts[0];bpy.ops.object.join();o=bpy.context.object
 bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');o.name=name
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
 bpy.ops.export_scene.fbx(filepath=os.path.join(k.OUT,name+'.fbx'),use_selection=True,object_types={'MESH'},axis_forward='-Z',axis_up='Y',add_leaf_bones=False,bake_anim=False)
 rows.append({'asset':name,'vertices':len(o.data.vertices),'polygons':len(o.data.polygons),'materials':len(o.data.materials)})
def branch(a,b,r):
 d=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cone_add(vertices=8,radius1=r,radius2=r*.55,depth=d.length,location=(Vector(a)+Vector(b))/2);o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(k.mats['Bark']);k.parts.append(o)
def foliage(at,r,seed):
 verts=[];faces=[]
 for ring in range(4):
  scale=[.30,1,.85,.12][ring]
  for i in range(10):
   a=2*math.pi*i/10;variation=1+.14*math.sin(i*2.7+seed)
   verts.append((at[0]+math.cos(a)*r*scale*variation,at[1]+math.sin(a)*r*.8*scale*variation,at[2]+(ring-1)*r*.30+.06*math.cos(i*3+seed)))
 for ring in range(3):
  for i in range(10):faces.append((ring*10+i,ring*10+(i+1)%10,(ring+1)*10+(i+1)%10,(ring+1)*10+i))
 faces.extend([tuple(range(9,-1,-1)),tuple(range(30,40))]);mesh=bpy.data.meshes.new('Layered leaf mantle');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Crown',mesh);bpy.context.collection.objects.link(o)
 for role in ['Green','LeafLight','LeafDark']:mesh.materials.append(k.mats[role])
 for face in mesh.polygons:face.material_index=1 if face.normal.z>.4 else 2 if face.normal.z<-.3 else 0
 k.parts.append(o)
for variant in range(2):
 start();branch((0,0,0),(.12,0,1.55),.17)
 for i in range(5):
  a=i*2.399+variant*.7;end=(math.cos(a)*(.65+variant*.16),math.sin(a)*.65,1.45+i*.18)
  branch((.06,0,.8+i*.12),end,.08);foliage(end,.64+(.12 if i%2 else 0),i+variant*5)
 foliage((.12,0,2.35),.62,7);save('RealmOak'+str(variant+1))
start();k.hall(0,0,.08,1.2,.9,.88);k.hall(.63,.15,.08,.52,.65,.55)
k.box((-.45,-.62,.15),(.35,.30,.12));k.box((0,-.50,.92),(.65,.3,.08),'Wood')
for x in [-.28,.28]:k.box((x,-.63,1.04),(.04,.04,.28),'Wood')
k.box((0,-.65,1.15),(.65,.04,.04),'Wood');save('GreekHome')
start()
for x in [-.65,.65]:
 for y in [-.4,.4]:k.box((x,y,.65),(.06,.06,1.3),'Wood')
k.roof(0,0,1.3,1.65,1.1);k.box((0,-.25,.4),(1.3,.45,.55),'Wood')
for x in [-.43,0,.43]:k.box((x,-.25,.73),(.32,.30,.12),'Gold')
k.box((.75,.40,.35),(.3,.35,.55),'Banner');save('GreekMarketStall')
start()
for x in [-.78,.78]:
 k.box((x,0,.67),(.55,.72,1.34));k.roof(x,0,1.38,.76,.91)
 k.box((x,-.38,.94),(.12,.04,.32),'Recess');k.box((x,-.40,.55),(.28,.04,.36),'Banner')
k.box((0,0,1.45),(1.2,.6,.22));save('GreekGatehouse')
start()
# Broken enclosure, ridge shelter and lookout mast: recognizable hostile camp.
for side in [-1,1]:
 for i in range(4):k.box((side*.87,.25+i*.2,.48),(.09,.12,.96),'Wood')
k.roof(-.22,.45,.85,1.35,1.15);k.box((-.22,.96,.43),(1.05,.10,.85),'Wood')
for x in [-.78,.34]:k.box((x,-.05,.45),(.07,.07,.9),'Wood')
k.box((.8,-.4,1.0),(.07,.07,2),'Wood');k.box((1.02,-.4,1.65),(.4,.05,.45),'Banner')
for i in range(3):k.box((-.65+i*.3,-.55,.12),(.20,.25,.22),'Wood')
save('ForsakenShelter')
print(json.dumps(rows,indent=2))
