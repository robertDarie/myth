"""Independent FBX import, skin/bone/clip checks and original model review renders."""
import bpy,os,json,math,sys
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));folder=os.path.join(ROOT,'client/Assets/ThronesOfMyth/Resources/Art/Units');states=['Idle','March','Attack','Skill','Retreat','Victory','Gather','Hit'];rows=[]
def clear():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for a in list(bpy.data.actions):bpy.data.actions.remove(a)
def validate(name):
 clear();bpy.ops.import_scene.fbx(filepath=os.path.join(folder,name+'.fbx'));rigs=[o for o in bpy.context.scene.objects if o.type=='ARMATURE'];meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];assert len(rigs)==1 and meshes,name
 rig=rigs[0];assert len(rig.data.bones)>=11,name
 for mesh in meshes:
  assert any(m.type=='ARMATURE' and m.object==rig for m in mesh.modifiers),name
  assert all(v.groups and abs(sum(g.weight for g in v.groups)-1)<.001 for v in mesh.data.vertices),(name,'unweighted vertex')
 actions={s:next((a for a in bpy.data.actions if a.name.endswith('|'+s) or a.name==s or a.name.endswith('_'+s)),None) for s in states}
 assert all(actions.values()),(name,list(bpy.data.actions))
 assert all(a.frame_range[1]>a.frame_range[0] for a in actions.values()),name
 # Actual pose matrices must change, beyond merely exporting named empty takes.
 bone=rig.pose.bones['LegL'];rig.animation_data.action=actions['March'];bpy.context.scene.frame_set(int(actions['March'].frame_range[0]));before=bone.matrix.copy();bpy.context.scene.frame_set(int(actions['March'].frame_range[0]+6));assert sum(abs(before[i][j]-bone.matrix[i][j]) for i in range(4) for j in range(4))>.01,(name,'static march')
 mesh=meshes[0];motion={}
 for state,action in actions.items():
  rig.animation_data.action=action;first=int(action.frame_range[0]);quarter=int(first+(action.frame_range[1]-first)/4);bpy.context.scene.frame_set(first);deps=bpy.context.evaluated_depsgraph_get();evaluated=mesh.evaluated_get(deps);posed=evaluated.to_mesh();positions=[v.co.copy()for v in posed.vertices];evaluated.to_mesh_clear()
  bpy.context.scene.frame_set(quarter);deps=bpy.context.evaluated_depsgraph_get();evaluated=mesh.evaluated_get(deps);posed=evaluated.to_mesh();deformation=max((a-v.co).length for a,v in zip(positions,posed.vertices));evaluated.to_mesh_clear();assert deformation>.001,(name,state,'skin does not deform');motion[state]=round(deformation,4)
 rig.animation_data.action=actions['Idle'];bpy.context.scene.frame_set(int(actions['Idle'].frame_range[0]));
 rows.append({'asset':name,'bones':len(rig.data.bones),'vertices':sum(len(o.data.vertices) for o in meshes),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes),'deformation':motion,'clips':{s:round((a.frame_range[1]-a.frame_range[0])/bpy.context.scene.render.fps,3) for s,a in actions.items()}})
for file in sorted(os.listdir(folder)):
 if file.endswith('.fbx'):validate(file[:-4])
assert len(rows)==36
with open(os.path.join(ROOT,'docs/art/army-validation-0.17.json'),'w')as f:json.dump(rows,f,indent=2)
print('Verified',len(rows),'weighted FBX models,',len(rows)*8,'takes and moving march poses')
if "--checks-only" in sys.argv: sys.exit(0)
# Render actual imported assets, not a Unity screenshot.
clear();scene=bpy.context.scene
for i,role in enumerate(['Infantry','Archer','Cavalry','Commander','Mythic']):
 bpy.ops.import_scene.fbx(filepath=os.path.join(folder,'Greek'+role+'.fbx'));imported=list(bpy.context.selected_objects);pivot=bpy.data.objects.new('Review placement',None);bpy.context.collection.objects.link(pivot)
 for o in imported:
  if o.parent not in imported:o.parent=pivot
 pivot.location=(i*2.5-5,0,0)
 if role=='Mythic':pivot.scale=(1.2,)*3
 bpy.ops.object.text_add(location=(i*2.5-5,-1.4,.03));txt=bpy.context.object;txt.data.body=role.upper();txt.data.align_x='CENTER';txt.data.size=.24
bpy.ops.mesh.primitive_plane_add(size=30,location=(0,0,-.03));plane=bpy.context.object;m=bpy.data.materials.new('Review floor');m.diffuse_color=(.25,.33,.28,1);plane.data.materials.append(m)
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=False;scene.world.color=(.65,.65,.65)
bpy.ops.object.light_add(type='AREA',location=(-3,-4,9));bpy.context.object.data.energy=1700;bpy.context.object.data.size=7
bpy.ops.object.camera_add(location=(6,-13,7));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,1))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=16;scene.camera=camera
scene.render.resolution_x=1440;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.view_settings.view_transform='Standard';scene.render.filepath=os.path.join(ROOT,'docs/art/greek-army-0.17.png');bpy.ops.render.render(write_still=True)

clear();scene=bpy.context.scene
for row,culture in enumerate(['Greek','Egyptian','Norse','Chinese','Japanese']):
 for col,role in enumerate(['Infantry','Archer','Cavalry','Commander','Mythic']):
  bpy.ops.import_scene.fbx(filepath=os.path.join(folder,culture+role+'.fbx'));imported=list(bpy.context.selected_objects);pivot=bpy.data.objects.new('Review placement',None);bpy.context.collection.objects.link(pivot)
  for o in imported:
   if o.parent not in imported:o.parent=pivot
  pivot.location=(col*2.7-5.4,row*3.8-7.6,0)
  for a in bpy.data.actions:
   if a.name.endswith('|Idle')or a.name=='Idle':
    rig=next((o for o in imported if o.type=='ARMATURE'),None)
    if rig:rig.animation_data.action=a
 bpy.ops.object.text_add(location=(-7.6,row*3.8-7.6,0));txt=bpy.context.object;txt.data.body=culture.upper();txt.data.align_x='CENTER';txt.data.size=.27
bpy.ops.mesh.primitive_plane_add(size=35,location=(0,0,-.03));bpy.context.object.data.materials.append(m)
bpy.ops.object.light_add(type='AREA',location=(-3,-4,14));bpy.context.object.data.energy=2400;bpy.context.object.data.size=10
bpy.ops.object.camera_add(location=(11,-19,21));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,1))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=26;scene.camera=camera
scene.render.resolution_x=1600;scene.render.resolution_y=1300;scene.render.filepath=os.path.join(ROOT,'docs/art/civilization-armies-0.17.png');bpy.context.scene.frame_set(1);bpy.ops.render.render(write_still=True)
