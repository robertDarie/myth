"""Blender FBX geometry diagnostic, not Unity lighting or shader acceptance.

Run: blender -b -t 2 --python tools/inspect_vegetation.py
Prints results only; does not rewrite exported assets or tracked evidence.
"""
import json
import math
from pathlib import Path

import bpy
import bmesh

ROOT = Path(__file__).resolve().parents[1]
rows = []
for name in ("RealmOak1", "RealmOak2", "OakTree", "PineTree"):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.fbx(filepath=str(ROOT / "client/Assets/ThronesOfMyth/Resources/Art/Models" / (name + ".fbx")))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    assert meshes, name
    components = 0
    minimum_volume = float("inf")
    for obj in meshes:
        assert obj.matrix_world.to_3x3().determinant() > 0, (name, "mirrored object transform")
        assert all(math.isfinite(value) for v in obj.data.vertices for value in (*v.co, *v.normal)), name
        assert all(v.normal.length > .9 for v in obj.data.vertices), (name, "invalid vertex normal")
        bm = bmesh.new()
        try:
            bm.from_mesh(obj.data)
            unseen = set(bm.verts)
            # Verify each connected shell: positive volume cannot conceal an inverted leaf shell.
            while unseen:
                seed = unseen.pop()
                shell, queue = {seed}, [seed]
                while queue:
                    for edge in queue.pop().link_edges:
                        for vertex in edge.verts:
                            if vertex in unseen:
                                unseen.remove(vertex)
                                shell.add(vertex)
                                queue.append(vertex)
                faces = {face for vertex in shell for face in vertex.link_faces}
                assert faces and all(edge.is_manifold for vertex in shell for edge in vertex.link_edges), (name, "open/non-manifold shell")
                volume = 0.0
                for face in faces:
                    first = face.verts[0].co
                    for index in range(1, len(face.verts) - 1):
                        volume += first.dot(face.verts[index].co.cross(face.verts[index + 1].co)) / 6.0
                assert volume > 1e-9, (name, "inverted or zero-volume shell", volume)
                minimum_volume = min(minimum_volume, volume)
                components += 1
        finally:
            bm.free()
    rows.append({"asset": name, "outward_closed_shells": components, "minimum_signed_volume": round(minimum_volume, 7)})
print(json.dumps(rows, indent=2))
print("Vegetation geometry checks passed. Unity materials, GPU normals and shadows remain unverified.")
