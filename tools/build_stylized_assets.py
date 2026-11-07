"""Run with Blender: blender -b --python tools/build_stylized_assets.py.
Original low-poly city/environment meshes; exports FBX and a review render.
"""
import bpy, math, os
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'client/Assets/ThronesOfMyth/Resources/Art/Models')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system='METRIC'
PALETTE={'Stone':(.78,.70,.53,1),'Roof':(.62,.22,.12,1),'Wood':(.25,.14,.07,1),'Gold':(.82,.58,.19,1),'Banner':(.12,.42,.69,1),'Window':(.97,.72,.26,1),'Ground':(.36,.48,.25,1),'Green':(.22,.43,.19,1),'Bark':(.31,.19,.10,1),'Rock':(.43,.47,.41,1)}
mats={}
for role,color in PALETTE.items():
 m=bpy.data.materials.new(role);m.diffuse_color=color;m.use_nodes=True;bsdf=m.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=color;bsdf.inputs['Roughness'].default_value=.83;mats[role]=m
parts=[]
def finish(o,role):o.data.materials.append(mats[role]);parts.append(o);return o
def box(at,size,role,bevel=.025):
 bpy.ops.mesh.primitive_cube_add(size=1,location=at);o=bpy.context.object;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Soft carved edges','BEVEL');mod.width=bevel;mod.segments=1
 return finish(o,role)
def pillar(at,r,h,role,vertices=10):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=h,location=at);return finish(bpy.context.object,role)
def mesh(name,verts,faces,role):
 data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update();o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);return finish(o,role)
def roof(x,y,z,w,d,rise,role='Roof'):
 return mesh('Pitched tile roof',[(x-w/2,y-d/2,z),(x+w/2,y-d/2,z),(x-w/2,y+d/2,z),(x+w/2,y+d/2,z),(x,y-d/2,z+rise),(x,y+d/2,z+rise)],[(0,2,5,4),(4,5,3,1),(0,4,1),(2,3,5),(0,1,3,2)],role)
def pagoda_roof(x,y,z,w,role='Roof'):
 verts=[]
 for scale,dz in [(1,0),(.83,.04),(.15,.30)]:
  for i in range(8):
   a=math.pi/4*i;xx=math.cos(a);yy=math.sin(a);k=max(abs(xx),abs(yy));verts.append((x+xx/k*w/2*scale,y+yy/k*w/2*scale,z+dz+(.11 if i%2 else 0)*scale))
 faces=[(ring*8+i,ring*8+(i+1)%8,(ring+1)*8+(i+1)%8,(ring+1)*8+i) for ring in range(2) for i in range(8)]
 mesh('Swept tiled eaves',verts,faces,role)
def house(x,y,culture):
 box((x,y,.49),(.58,.65,.62),'Wood' if culture=='Norse' else 'Stone');roof(x,y,.80,.74,.79,.29)
 box((x,y-.335,.48),(.16,.025,.27),'Window',0)
def city(culture):
 box((0,0,.10),(3.3,3,.2),'Ground',.08)
 for x in [-1.48,1.48]:box((x,0,.39),(.16,2.75,.6),'Wood' if culture=='Norse' else 'Stone')
 box((0,1.32,.39),(2.9,.16,.6),'Stone')
 for x in [-1.02,1.02]:box((x,-1.32,.39),(.95,.16,.6),'Stone')
 for x in [-1.44,1.44]:
  for y in [-1.27,1.27]:
   box((x,y,.55),(.4,.4,.95),'Stone');roof(x,y,1.02,.53,.53,.18)
 for x in [-1.0,1.0]:house(x,.45,culture)
 if culture=='Greek':
  box((0,-.1,.32),(1.55,1.45,.2),'Stone')
  for x in [-.62,.62]:
   for y in [-.67,.45]:pillar((x,y,.93),.10,1.08,'Stone');box((x,y,1.47),(.26,.24,.10),'Gold')
  box((0,-.1,.85),(.82,.81,.93),'Stone');roof(0,-.1,1.56,1.77,1.59,.42)
 elif culture=='Egyptian':
  for i in range(3):box((0,.12,.27+i*.12),(1.65-i*.14,1.65-i*.14,.12),'Stone')
  mesh('Pyramid', [(-.70,-.58,.58),(.70,-.58,.58),(.70,.82,.58),(-.70,.82,.58),(0,.12,1.95)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],'Stone')
  for x in [-.72,.72]:box((x,-.85,.83),(.34,.36,1.22),'Stone');box((x,-.85,1.47),(.18,.18,.10),'Gold')
  box((0,-1.03,1.06),(1.2,.18,.17),'Gold')
 elif culture=='Norse':
  box((0,0,.87),(1.55,1.75,1.2),'Wood');roof(0,0,1.49,1.9,2.0,.75)
  for y in [-1.01,1.01]:pillar((0,y,2.26),.08,.34,'Gold',8)
  box((0,-.89,.85),(.4,.025,.63),'Gold');box((0,-.91,.82),(.25,.025,.5),'Wood')
 else:
  for i in range(3 if culture=='Japanese' else 2):
   size=1.65-i*.38;z=.48+i*.64;box((0,0,z),(size-.16,size-.16,.5),'Stone' if culture=='Japanese' else 'Banner');pagoda_roof(0,0,z+.27,size+.25)
   for x in [-size*.33,size*.33]:box((x,-size*.46,z),(.07,.07,.47),'Wood')
  pillar((0,0,2.35 if culture=='Japanese' else 1.78),.06,.38,'Gold')
  if culture=='Japanese':
   for x in [-.38,.38]:pillar((x,-1.37,.75),.06,1.02,'Banner',8)
   box((0,-1.37,1.24),(1.0,.14,.12),'Banner')
 for x in [-.43,.43]:pillar((x,-1.31,.70),.045,1.0,'Gold',8)
 box((.18,-1.31,1.02),(.36,.04,.36),'Banner')
 return export('City'+culture)
def export(name):
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.convert(target='MESH');bpy.ops.object.join();obj=bpy.context.object
 bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');obj.name=name
 bpy.ops.export_scene.fbx(filepath=os.path.join(OUT,name+'.fbx'),use_selection=True,object_types={'MESH'},add_leaf_bones=False,bake_anim=False,axis_forward='-Z',axis_up='Y',apply_scale_options='FBX_SCALE_UNITS')
 parts.clear();return obj
def tree(pine=False):
 pillar((0,0,.65),.13,1.3,'Bark',8)
 if pine:
  for z,r in [(1.0,.85),(1.55,.65),(2.05,.42)]:bpy.ops.mesh.primitive_cone_add(vertices=8,radius1=r,radius2=0,depth=1.15,location=(0,0,z));finish(bpy.context.object,'Green')
 else:
  for x,y,z,r in [(-.35,0,1.6,.68),(.32,.12,1.72,.72),(0,-.20,2.05,.65)]:bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=r,location=(x,y,z));finish(bpy.context.object,'Green')
 return export('PineTree' if pine else 'OakTree')
def rock():
 for x,y,z,s in [(-.55,0,.35,(.8,.7,.5)),(.4,.1,.5,(1,.75,.8)),(0,-.45,.25,(.5,.6,.4))]:
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(x,y,z));o=finish(bpy.context.object,'Rock');o.scale=s
 return export('BorderRock')
assets=[]
for i,culture in enumerate(['Greek','Egyptian','Norse','Chinese','Japanese']):
 o=city(culture);o.location=(i*4-8,0,0);assets.append(o)
# Recolour the preview by culture without changing the role names exported to Unity.
for i,o in enumerate(assets):
 colors={'Roof':[(.65,.23,.12,1),(.16,.53,.57,1),(.20,.32,.31,1),(.19,.44,.35,1),(.19,.27,.44,1)][i], 'Banner':(.12,.43,.72,1)}
 for slot in o.material_slots:
  if slot.material.name in colors:
   m=slot.material.copy();m.diffuse_color=colors[slot.material.name];m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=m.diffuse_color;slot.material=m
for i,pine in enumerate([False,True]):o=tree(pine);o.location=(-5+i*4,3.3,0)
o=rock();o.location=(4,3.3,0)
# Review scene is an asset lineup, not a screenshot of the Unity game.
box((0,0,-.20),(24,13,.2),'Ground',0)
for i,culture in enumerate(['GREEK','EGYPTIAN','NORSE','CHINESE','JAPANESE']):
 bpy.ops.object.text_add(location=(i*4-8,-2.2,.03));o=bpy.context.object;o.data.body=culture;o.data.align_x='CENTER';o.data.size=.34;o.data.extrude=.002;o.data.materials.append(mats['Wood'])
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=False
scene.world.color=(.65,.65,.65)
bpy.ops.object.light_add(type='AREA',location=(-3,-4,11));bpy.context.object.data.energy=1900;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=8
bpy.ops.object.camera_add(location=(10,-17,16));camera=bpy.context.object;camera.rotation_euler=(Vector((0,.5,0))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=25;scene.camera=camera
scene.render.resolution_x=1440;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard';scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(ROOT,'docs/art/stylized-assets-0.16.png');bpy.ops.render.render(write_still=True)
print('Exported 8 original FBX assets and review render')
