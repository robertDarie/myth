"""Original stylized skinned armies. Run: blender -b --python tools/build_army_assets.py.
Each FBX has one weighted mesh, an explicit armature, a facing marker and 8 actions.
"""
import bpy,math,os,json
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));OUT=os.path.join(ROOT,'client/Assets/ThronesOfMyth/Resources/Art/Units');os.makedirs(OUT,exist_ok=True)
bpy.context.scene.render.fps=30
CULTURES=['Greek','Egyptian','Norse','Chinese','Japanese'];ROLES=['Infantry','Archer','Cavalry','Commander','Mythic']
HEROES={'captain':('Greek','Commander'),'warden':('Greek','Commander'),'scout':('Greek','Archer'),'rune-seer':('Norse','Commander'),'atalanta':('Greek','Archer'),'mulan':('Chinese','Commander'),'tomoe':('Japanese','Commander'),'horus-champion':('Egyptian','Commander'),'heracles':('Greek','Commander'),'sigurd':('Norse','Commander'),'wukong':('Chinese','Commander')}
STATES={'Idle':(48,True),'March':(24,True),'Attack':(20,False),'Skill':(28,False),'Retreat':(28,True),'Victory':(36,False),'Gather':(32,True),'Hit':(10,False)}
COLORS={'Skin':(.72,.51,.32,1),'Cloth':(.14,.39,.60,1),'Banner':(.13,.43,.72,1),'Armor':(.57,.37,.15,1),'Steel':(.65,.69,.67,1),'Wood':(.30,.17,.08,1),'Leather':(.27,.14,.07,1),'Crest':(.66,.17,.12,1),'Fur':(.38,.23,.13,1),'Ivory':(.92,.83,.59,1),'Spirit':(.29,.62,.67,1)}
parts=[];mats={};rig=None;spec={}
def clean():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for a in list(bpy.data.actions):bpy.data.actions.remove(a)
 parts.clear()
def materials(culture):
 mats.clear()
 colors=dict(COLORS);colors['Cloth']={'Greek':(.13,.42,.65,1),'Egyptian':(.13,.57,.58,1),'Norse':(.29,.43,.36,1),'Chinese':(.56,.18,.13,1),'Japanese':(.24,.28,.53,1)}[culture]
 colors['Armor']={'Greek':(.70,.48,.20,1),'Egyptian':(.82,.61,.23,1),'Norse':(.40,.45,.46,1),'Chinese':(.55,.39,.16,1),'Japanese':(.22,.24,.31,1)}[culture]
 for role,color in colors.items():
  m=bpy.data.materials.new(role);m.diffuse_color=color;m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=color;m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.72;mats[role]=m
 return colors
def finish(o,role,bone):
 o.data.materials.append(mats[role]);g=o.vertex_groups.new(name=bone);g.add(list(range(len(o.data.vertices))),1,'REPLACE');parts.append(o);return o
def box(at,size,role,bone,bevel=.035):
 bpy.ops.mesh.primitive_cube_add(size=1,location=at);o=bpy.context.object;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:mod=o.modifiers.new('Carved armor edges','BEVEL');mod.width=bevel;mod.segments=1
 return finish(o,role,bone)
def ball(at,size,role,bone):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=at);o=bpy.context.object;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,role,bone)
def rod(a,b,r,role,bone,vertices=8):
 v=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=v.length,location=(Vector(a)+Vector(b))/2);o=bpy.context.object;o.rotation_euler=v.to_track_quat('Z','Y').to_euler();return finish(o,role,bone)
def horn(a,b,r=.10,role='Ivory',bone='Head'):
 v=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cone_add(vertices=8,radius1=r,radius2=.012,depth=v.length,location=(Vector(a)+Vector(b))/2);o=bpy.context.object;o.rotation_euler=v.to_track_quat('Z','Y').to_euler();return finish(o,role,bone)
def make_rig(mount=False,beast=False):
 global rig
 data=bpy.data.armatures.new('Oathbound skeleton');rig=bpy.data.objects.new('Rig',data);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 bones=[('Root',(0,0,0),(0,0,.2),None),('Pelvis',(0,0,.85),(0,0,1.02),'Root'),('Spine',(0,0,1.02),(0,0,1.53),'Pelvis'),('Head',(0,0,1.53),(0,0,1.95),'Spine'),('ArmL',(-.29,0,1.48),(-.42,0,.97),'Spine'),('ArmR',(.29,0,1.48),(.42,0,.97),'Spine'),('LegL',(-.16,0,.9),(-.16,0,.15),'Pelvis'),('LegR',(.16,0,.9),(.16,0,.15),'Pelvis'),('Cape',(0,.17,1.44),(0,.23,.80),'Spine'),('WingL',(-.22,.20,1.42),(-1.0,.15,1.25),'Spine'),('WingR',(.22,.20,1.42),(1.0,.15,1.25),'Spine')]
 for side,x in [('L',-.16),('R',.16)]:bones.append(('Shin'+side,(x,0,.52),(x,0,.15),'Leg'+side))
 for side,x in [('L',-.40),('R',.40)]:bones.append(('Forearm'+side,(x,0,1.20),(x,0,.97),'Arm'+side))
 if mount:
  bones += [('Mount',(0,0,.8),(0,-.4,1.1),'Root'),('MountHead',(0,-.60,1.23),(0,-.95,1.60),'Mount')]
  for name,x,y in [('MountFL',-.27,-.5),('MountFR',.27,-.5),('MountBL',-.27,.5),('MountBR',.27,.5)]:bones.append((name,(x,y,.83),(x,y,.12),'Mount'))
 for name,head,tail,parent in bones:
  b=data.edit_bones.new(name);b.head=head;b.tail=tail
  if parent:b.parent=data.edit_bones[parent]
 bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
 marker=bpy.data.objects.new('FacingForward',None);bpy.context.collection.objects.link(marker);marker.parent=rig;marker.location=(0,-1,0)
 return marker
def horse(culture,spirit=False):
 ball((0,0,.95),(.40,.80,.43),'Spirit' if spirit else 'Fur','Mount');ball((0,-.62,1.23),(.22,.42,.40),'Spirit' if spirit else 'Fur','MountHead');ball((0,-.88,1.49),(.21,.30,.23),'Spirit' if spirit else 'Fur','MountHead')
 for x in [-.27,.27]:
  for y in [-.50,.50]:
   name=('MountF' if y<0 else 'MountB')+('L' if x<0 else 'R');rod((x,y,.88),(x,y,.16),.09,'Fur',name);box((x,y-.04,.10),(.20,.26,.17),'Leather',name)
 rod((0,.70,1),(0,1.1,.55),.07,'Leather','Mount');box((0,0,1.31),(.68,.68,.12),'Cloth','Mount')
 for x in [-.15,.15]:horn((x,-.86,1.67),(x*1.2,-.86,1.97),.07,'Armor' if spirit else 'Fur','MountHead')
 if spirit:
  horn((0,-1.01,1.65),(0,-1.35,2.08),.09,'Ivory','MountHead');rod((-.15,-1.06,1.43),(-.44,-1.36,1.30),.025,'Ivory','MountHead');rod((.15,-1.06,1.43),(.44,-1.36,1.30),.025,'Ivory','MountHead')
def humanoid(culture,role,hero=''):
 mounted=role=='Cavalry';offset=.70 if mounted else 0
 # Translate human bone bind positions up to the saddle; mesh and skeleton stay aligned.
 if mounted:
  for b in rig.data.bones:
   if b.name not in ['Root','Mount','MountFL','MountFR','MountBL','MountBR','MountHead']:
    pass
  bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
  for b in rig.data.edit_bones:
   if b.name not in ['Root','Mount','MountFL','MountFR','MountBL','MountBR','MountHead']:b.head.z+=offset;b.tail.z+=offset
  bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False);horse(culture)
 z=lambda v:v+offset
 box((0,0,z(1.25)),(.60,.38,.58),'Armor','Spine');box((0,-.205,z(1.35)),(.18,.035,.20),'Banner','Spine');box((0,.03,z(.89)),(.53,.38,.28),'Cloth','Pelvis');ball((0,-.015,z(1.73)),(.23,.22,.27),'Skin','Head')
 for x in [-.16,.16]:
  side='L' if x<0 else 'R';rod((x,0,z(.88)),(x,0,z(.53)),.115,'Cloth','Leg'+side);rod((x,0,z(.53)),(x,-.03,z(.20)),.10,'Cloth','Shin'+side);box((x,-.09,z(.13)),(.24,.38,.20),'Leather','Shin'+side)
 for x in [-.36,.36]:
  side='L' if x<0 else 'R';ball((x,0,z(1.47)),(.19,.20,.16),'Armor','Arm'+side);rod((x,0,z(1.41)),(x,0,z(1.20)),.10,'Skin','Arm'+side);rod((x,0,z(1.20)),(x,-.04,z(.96)),.09,'Skin','Forearm'+side);ball((x,-.04,z(.94)),(.11,.11,.12),'Skin','Forearm'+side)
 # Helmets and cultural silhouette kits.
 ball((0,.01,z(1.91)),(.26,.25,.16),'Leather' if role=='Archer' else 'Fur' if hero=='heracles' else 'Armor','Head')
 if culture=='Greek':
  if role!='Archer' and hero!='heracles':box((0,.03,z(2.07)),(.075,.40,.22),'Crest','Head');box((-.20,-.10,z(1.75)),(.09,.16,.29),'Armor','Head');box((.20,-.10,z(1.75)),(.09,.16,.29),'Armor','Head')
 elif culture=='Egyptian':
  for x in [-.22,.22]:box((x,.02,z(1.70)),(.13,.30,.50),'Cloth','Head');box((0,-.21,z(1.88)),(.12,.06,.15),'Armor','Head')
 elif culture=='Norse':
  ball((0,.08,z(1.51)),(.47,.30,.17),'Fur','Spine');box((0,-.18,z(1.57)),(.14,.11,.35),'Fur','Head')
 elif culture=='Chinese':
  horn((0,.03,z(2.0)),(0,.04,z(2.38)),.12,'Crest','Head')
  for x in [-.21,0,.21]:box((x,-.22,z(1.25)),(.15,.06,.50),'Armor','Spine')
 else:
  for x in [-.27,.27]:box((x,0,z(1.83)),(.20,.31,.10),'Armor','Head');horn((x,-.07,z(1.95)),(x*1.5,-.10,z(2.22)),.07,'Armor','Head')
  for v in [.90,1.02,1.14]:box((0,-.23,z(v)),(.57,.09,.08),'Armor','Pelvis' if v<1 else 'Spine')
 # Faces: eyes and nose remain readable at portrait zoom.
 for x in [-.085,.085]:box((x,-.223,z(1.78)),(.035,.025,.04),'Leather','Head',0)
 box((0,-.25,z(1.72)),(.055,.09,.09),'Skin','Head',.01)
 if role in ['Commander','Cavalry']:
  box((0,.25,z(1.13)),(.58,.07,.82),'Cloth','Cape')
 if role=='Archer' or hero in ['atalanta','scout','tomoe']:
  for a,b in [((-.42,-.19,z(.83)),(-.63,-.24,z(1.20))),((-.63,-.24,z(1.20)),(-.42,-.19,z(1.65)))]:rod(a,b,.035,'Wood','ForearmL')
  rod((-.42,-.19,z(.83)),(-.42,-.19,z(1.65)),.012,'Ivory','ForearmL');box((.12,.29,z(1.24)),(.22,.18,.61),'Leather','Spine')
  for i in range(3):rod((.07+i*.06,.30,z(1.35)),(.07+i*.06,.30,z(1.76)),.012,'Wood','Spine')
 else:
  rod((.40,-.12,z(.86)),(.40,-.12,z(2.13 if role!='Commander' else 1.85)),.025,'Wood','ForearmR');horn((.40,-.12,z(2.13)),(.40,-.12,z(2.43)),.07,'Steel','ForearmR')
  bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.32,depth=.07,location=(-.43,-.20,z(1.15)),rotation=(math.pi/2,0,0));finish(bpy.context.object,'Armor','ForearmL');ball((-.43,-.25,z(1.15)),(.11,.05,.11),'Banner','ForearmL')
 if hero=='heracles':
  ball((0,.13,z(1.53)),(.52,.32,.25),'Fur','Spine');box((.41,-.12,z(1.90)),(.27,.27,.55),'Wood','ForearmR')
 if hero=='wukong':
  ball((0,-.22,z(1.73)),(.20,.14,.12),'Fur','Head');rod((0,.22,z(.9)),(.20,.65,z(.8)),.045,'Fur','Pelvis');rod((.20,.65,z(.8)),(.32,.72,z(1.1)),.04,'Fur','Pelvis')
  rod((.40,-.13,z(.65)),(.40,-.13,z(2.5)),.06,'Armor','ForearmR');horn((0,.08,z(2.0)),(.10,.08,z(2.5)),.05,'Crest','Head')
 if hero=='rune-seer':ball((.40,-.12,z(2.30)),(.15,.15,.22),'Spirit','ForearmR')
 if hero=='horus-champion':horn((0,-.25,z(1.75)),(0,-.58,z(1.67)),.12,'Armor','Head')
def mythic(culture):
 if culture in ['Egyptian','Chinese']:
  horse(culture,spirit=culture=='Chinese')
  if culture=='Egyptian':
   ball((0,-.80,1.63),(.27,.25,.33),'Skin','MountHead');box((0,-.80,1.94),(.58,.49,.17),'Armor','MountHead')
   for side in [-1,1]:box((side*.73,.25,1.48),(1.1,.46,.13),'Cloth','WingL' if side<0 else 'WingR')
  return
 humanoid(culture,'Commander')
 if culture=='Greek':
  ball((0,-.10,1.77),(.34,.28,.30),'Fur','Head');ball((0,-.36,1.63),(.27,.20,.16),'Fur','Head')
  for side in [-1,1]:horn((side*.27,.02,1.94),(side*.60,-.01,2.18),.14);horn((side*.60,-.01,2.18),(side*.65,-.05,2.43),.075)
  box((.41,-.12,1.65),(.68,.14,.41),'Steel','ForearmR')
 elif culture=='Norse':
  ball((0,-.01,1.77),(.31,.27,.33),'Spirit','Head');box((.41,-.12,1.85),(.39,.39,.80),'Rock' if 'Rock'in mats else 'Steel','ForearmR')
 else:
  horn((0,-.22,1.74),(0,-.62,1.68),.13,'Ivory');
  for side in [-1,1]:
   for i in range(3):box((side*(.50+i*.18),.26,1.38-i*.10),(.30,.52,.12),'Leather','WingL' if side<0 else 'WingR')
def animations(role,culture):
 for state,(length,loop)in STATES.items():
  action=bpy.data.actions.new(state);rig.animation_data_create();rig.animation_data.action=action
  for frame in sorted(set([1,1+length//4,1+length//2,1+length*3//4,length+1])):
   f=(frame-1)/length;wave=math.sin(f*2*math.pi);pulse=math.sin(f*math.pi)
   for b in rig.pose.bones:b.rotation_mode='XYZ';b.rotation_euler=(0,0,0);b.location=(0,0,0)
   walk=state in ['March','Retreat'];amount=.48 if state=='March' else .29
   if walk:
    for name,sign in [('LegL',1),('LegR',-1),('ArmL',-1),('ArmR',1)]:rig.pose.bones[name].rotation_euler.x=wave*amount*sign
    for side,sign in [('L',1),('R',-1)]:rig.pose.bones['Shin'+side].rotation_euler.x=max(0,-wave*sign)*.65;rig.pose.bones['Forearm'+side].rotation_euler.x=.15
    rig.pose.bones['Pelvis'].location.y=abs(wave)*.035
    if role=='Cavalry' or (role=='Mythic' and culture in ['Egyptian','Chinese']):
     for i,name in enumerate(['MountFL','MountFR','MountBL','MountBR']):rig.pose.bones[name].rotation_euler.x=math.sin(f*2*math.pi+(i%2)*math.pi)*.48
     rig.pose.bones['Mount'].location.y=abs(wave)*.045
   if role=='Mythic' and culture in ['Egyptian','Chinese'] and state in ['Attack','Skill','Hit']:rig.pose.bones['Mount'].rotation_euler.x=(-.22 if state!='Hit' else .14)*pulse
   if 'MountHead' in rig.pose.bones:
    rig.pose.bones['MountHead'].rotation_euler.x=wave*.025
    if role=='Mythic':rig.pose.bones['MountHead'].rotation_euler.x=wave*.025 if state=='Idle' else -.35*pulse if state in ['Attack','Skill','Victory'] else .5*abs(wave) if state=='Gather' else .20*pulse if state=='Hit' else .08*wave
   if state=='Idle':rig.pose.bones['Spine'].rotation_euler.x=wave*.025
   if state=='Attack':rig.pose.bones['ArmR'].rotation_euler.x=-1.2*pulse;rig.pose.bones['ArmL'].rotation_euler.x=-.55*pulse;rig.pose.bones['Spine'].rotation_euler.z=.17*pulse
   if state=='Attack':rig.pose.bones['ForearmR'].rotation_euler.x=-.4*pulse;rig.pose.bones['ForearmL'].rotation_euler.x=-.25*pulse
   if state=='Skill':rig.pose.bones['ArmR'].rotation_euler.x=-2.0*pulse;rig.pose.bones['ArmL'].rotation_euler.x=-1.0*pulse;rig.pose.bones['Spine'].rotation_euler.x=-.12*pulse
   if state=='Victory':rig.pose.bones['ArmR'].rotation_euler.x=-2.5*pulse
   if state=='Gather':rig.pose.bones['ArmR'].rotation_euler.x=-.5-.5*wave;rig.pose.bones['Spine'].rotation_euler.x=.18*abs(wave)
   if state=='Hit':rig.pose.bones['Spine'].rotation_euler.x=.25*pulse;rig.pose.bones['Head'].rotation_euler.x=-.15*pulse
   if state=='Retreat':rig.pose.bones['Spine'].rotation_euler.x=.16
   rig.pose.bones['Cape'].rotation_euler.x=.08+(.15 if walk else .04)*wave
   for name,sign in [('WingL',-1),('WingR',1)]:rig.pose.bones[name].rotation_euler.y=sign*(.15*wave+(.6*pulse if state=='Skill' else 0))
   for b in rig.pose.bones:
    b.keyframe_insert(data_path='rotation_euler',frame=frame);b.keyframe_insert(data_path='location',frame=frame)
  for fc in action.fcurves:
   for k in fc.keyframe_points:k.interpolation='BEZIER'
 rig.animation_data.action=bpy.data.actions.get('Idle');bpy.context.scene.frame_set(1)
def build(name,culture,role,hero=''):
 clean();palette=materials(culture);mount=role=='Cavalry' or (role=='Mythic' and culture in ['Egyptian','Chinese']);marker=make_rig(mount)
 if role=='Mythic':mythic(culture)
 else:humanoid(culture,role,hero)
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.convert(target='MESH');bpy.ops.object.join();o=bpy.context.object;o.name='SkinnedMesh';bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');o.parent=rig
 modifier=o.modifiers.new('Weighted skeletal deformation','ARMATURE');modifier.object=rig
 animations(role,culture);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);rig.select_set(True);marker.select_set(True)
 bpy.ops.export_scene.fbx(filepath=os.path.join(OUT,name+'.fbx'),use_selection=True,object_types={'MESH','ARMATURE','EMPTY'},add_leaf_bones=False,bake_anim=True,bake_anim_use_all_actions=True,bake_anim_use_nla_strips=False,bake_anim_simplify_factor=0.1,axis_forward='-Z',axis_up='Y',apply_scale_options='FBX_SCALE_UNITS')
 return {'asset':name,'culture':culture,'role':role,'hero':hero,'bones':len(rig.data.bones),'vertices':len(o.data.vertices),'faces':len(o.data.polygons),'actions':list(STATES),'palette':{k:list(v) for k,v in palette.items()}}
results=[]
for culture in CULTURES:
 for role in ROLES:results.append(build(culture+role,culture,role))
for hero,(culture,role)in HEROES.items():results.append(build('Hero_'+hero,culture,role,hero))
with open(os.path.join(ROOT,'docs/art/army-manifest-0.17.json'),'w')as f:json.dump(results,f,indent=2)
print('Exported',len(results),'original rigged army/hero FBXs with 8 action takes each')
