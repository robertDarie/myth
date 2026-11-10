"""Original Greek civic kit. blender -b --python tools/build_greek_districts.py
No external source assets. Joined, bevelled mesh per building; six material roles.
"""
import bpy, math, os, json
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'client/Assets/ThronesOfMyth/Resources/Art/Models')
colors={'Stone':(.79,.72,.59,1),'Roof':(.54,.22,.13,1),'Wood':(.24,.16,.10,1),'Gold':(.68,.49,.23,1),'Banner':(.12,.48,.57,1),'Recess':(.16,.21,.23,1)}
mats={}
for name,col in colors.items():
 m=bpy.data.materials.new(name);m.diffuse_color=col;mats[name]=m
parts=[]
def box(at,size,role='Stone'):
 bpy.ops.mesh.primitive_cube_add(size=1,location=at);o=bpy.context.object;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 mod=o.modifiers.new('Carved edge','BEVEL');mod.width=.025;mod.segments=1;bpy.ops.object.modifier_apply(modifier=mod.name);o.data.materials.append(mats[role]);parts.append(o);return o
def column(x,y,z,h):
 for base,height,radius in [(z,.08,.13),(z+.08,h,.085),(z+h+.08,.09,.14)]:
  bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=radius,depth=height,location=(x,y,base+height/2));o=bpy.context.object;o.data.materials.append(mats['Stone']);parts.append(o)
def roof(x,y,z,w,d):
 # Two solid sloping tile planes, exposed fascia and a capped ridge.
 rise=w*.24
 for sign in [-1,1]:
  o=box((x+sign*w/4,y,z+rise/2),(math.hypot(w/2,rise),d,.10),'Roof');o.rotation_euler[1]=sign*math.atan2(rise,w/2)
 box((x,y,z+rise+.03),(.12,d+.06,.12),'Gold')
 for edge in [-1,1]:box((x,y+edge*d/2,z-.02),(w+.08,.10,.13))
def hall(x,y,z,w,d,h):
 box((x,y,z+h/2),(w,d,h));roof(x,y,z+h+.06,w+.24,d+.20)
 box((x,y-d/2-.018,z+.36),(.29,.04,.65),'Recess')
 for side in [-1,1]:
  box((x+side*w*.34,y-d/2-.025,z+h*.66),(.18,.05,.27),'Recess')
  box((x+side*w*.34,y-d/2-.06,z+h*.66-.16),(.24,.12,.06))
def build(name,kind,level=1):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);parts.clear()
 for i in range(3):box((0,0,.04+i*.07),(2.3-i*.15,2-i*.15,.08))
 if kind=='citadel':
  hall(0,.30,.23,1.12,1.1,1.15 if level==1 else 1.65)
  for x in [-.78,.78]:
   hall(x,.45,.23,.38,.8,.62 if level==1 else 1.05)
   column(x,-.55,.23,.9 if level==1 else 1.35)
  roof(0,-.55,1.24 if level==1 else 1.69,1.9,.55)
  for i in range(4):box((0,-.85-i*.10,.20-i*.035),(.72,.15,.07))
  if level==2:
   box((0,.30,2.30),(.07,.07,.62),'Gold');box((.19,.30,2.47),(.34,.04,.34),'Banner')
 elif kind=='temple':
  hall(0,.3,.23,.8,.9,.84)
  for x in [-.76,.76]:
   for y in [-.65,0,.65]:column(x,y,.23,1.0)
  roof(0,0,1.41,1.9,1.8)
  box((0,-.63,.43),(.46,.33,.38),'Gold')
 else:
  hall(0,.47,.23,1.72,.58,.78)
  for x in [-.9,.9]:
   box((x,-.25,.45),(.12,1.15,.44));box((x,-.65,.88),(.06,.06,.9),'Wood')
   box((x+.13,-.65,1.15),(.24,.04,.36),'Banner')
  for x in [-.4,0,.4]:
   box((x,-.1,.53),(.045,.045,.6),'Wood');box((x,-.12,.66),(.24,.055,.28),'Gold')
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=bpy.context.object
 bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');o.name=name
 # Coherent outward normals; flat faces with bevelled edges and no overlapping coplanar trim.
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
 bpy.ops.export_scene.fbx(filepath=os.path.join(OUT,name+'.fbx'),use_selection=True,object_types={'MESH'},axis_forward='-Z',axis_up='Y',add_leaf_bones=False,bake_anim=False)
 return {'asset':name,'vertices':len(o.data.vertices),'polygons':len(o.data.polygons),'materials':len(o.data.materials)}
report=[build('GreekCitadel1','citadel'),build('GreekCitadel2','citadel',2),build('GreekTemple','temple'),build('GreekBarracks','barracks')]
print(json.dumps(report))
