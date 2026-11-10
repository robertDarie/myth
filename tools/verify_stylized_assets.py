"""Round-trip the exported FBX assets in Blender; this does not replace Unity import testing."""
import bpy, os, json
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
folder=os.path.join(ROOT,'client/Assets/ThronesOfMyth/Resources/Art/Models');results=[]
for name in sorted(os.listdir(folder)):
 if not name.endswith('.fbx'):continue
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 bpy.ops.import_scene.fbx(filepath=os.path.join(folder,name))
 objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];assert objects,name
 vertices=sum(len(o.data.vertices) for o in objects);faces=sum(len(o.data.polygons) for o in objects);assert vertices>=20 and faces>=20,(name,vertices,faces)
 size=max(max(o.dimensions) for o in objects);assert .5<size<5,(name,size)
 roles={m.name.split('.')[0] for o in objects for m in o.data.materials if m};assert roles,(name,'missing roles')
 results.append({'asset':name,'vertices':vertices,'faces':faces,'largest_dimension':round(size,3),'material_roles':sorted(roles)})
assert len(results)==12
with open(os.path.join(ROOT,'docs/art/asset-validation-0.39.json'),'w')as f:json.dump(results,f,indent=2)
print('Verified 12 FBX round trips:',sum(r['vertices'] for r in results),'vertices')
