using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;
namespace ThronesOfMyth.Editor
{
    public static class PresentationReview
    {
        [Serializable] private sealed class Result
        {
            public string unityVersion;
            public int checks;
            public bool success;
            public string[] errors;
            public string limitation="Presentation contracts only, not rendered acceptance or performance. Run camera review separately and capture actual gameplay.";
        }
        private static void Require(bool condition,string description,List<string> errors,ref int checks){checks++;if(!condition)errors.Add(description);}
        [MenuItem("Thrones of Myth/Visual Review/Validate Map Readability (Play Mode)")]
        public static void Validate()
        {
            if(!EditorApplication.isPlaying)throw new InvalidOperationException("Enter Play mode before validating instantiated resources and imported formations.");
            var errors=new List<string>();int checks=0;
            var art=new WorldArtFactory();var roots=new List<GameObject>();
            try
            {
                foreach(var resource in new[]{"food","wood","stone","gold","mana"})
                {
                    var root=new GameObject("Isolated resource review");root.transform.position=new Vector3(4000,0,4000);roots.Add(root);
                    var collider=root.AddComponent<BoxCollider>();
                    var actor=art.Build(root.transform,"node",resource,MythInterfaceTheme.Gold);
                    var stock=actor.GetComponent<ResourceSiteVisual>();Require(stock!=null,resource+": stock visual missing",errors,ref checks);
                    if(stock==null)continue;
                    foreach(var sample in new[]{new Vector2Int(600,4),new Vector2Int(300,2),new Vector2Int(1,1),new Vector2Int(0,0),new Vector2Int(-1,0),new Vector2Int(900,4)})
                    {
                        stock.Observe(sample.x,600);Require(stock.VisibleSections==sample.y,resource+": wrong stock sections at "+sample.x,errors,ref checks);
                        int active=0;foreach(var section in stock.stock)if(section.gameObject.activeSelf)active++;
                        Require(active==sample.y,resource+": inactive stock not reflected in hierarchy",errors,ref checks);
                    }
                    stock.Observe(0,600);Require(root.activeSelf&&collider.enabled,resource+": depleted site lost its picking root",errors,ref checks);
                }
                foreach(var culture in new[]{"greek","egyptian","norse","chinese","japanese"})
                {
                    var root=new GameObject("Isolated formation review");root.transform.position=new Vector3(4000,0,4000);roots.Add(root);var collider=root.AddComponent<BoxCollider>();
                    var actor=art.Build(root.transform,"army",culture,MythInterfaceTheme.Teal,2,new UnitCounts{infantry=12,archers=12,cavalry=12,veteranInfantry=2,veteranArchers=2,veteranCavalry=2},"captain");
                    actor.transform.localRotation=Quaternion.Euler(0,90,0);actor.ConfigureFootprint();Physics.SyncTransforms();
                    var pick=collider.bounds;pick.Expand(.05f);
                    foreach(var renderer in actor.GetComponentsInChildren<Renderer>())if(!(renderer is LineRenderer))
                        Require(pick.Contains(renderer.bounds.min)&&pick.Contains(renderer.bounds.max),culture+": picking bounds omit "+renderer.name,errors,ref checks);
                    actor.SetWideView(true);var roles=new HashSet<string>();int active=0;
                    foreach(var unit in actor.authored)if(!unit.commander&&unit.gameObject.activeSelf){roles.Add(unit.formationRole);active++;}
                    Require(roles.SetEquals(new[]{"Infantry","Archer","Cavalry","Mythic"})&&active==4,culture+": compact formation lost a role or retained duplicate proxies (imported assets required)",errors,ref checks);
                    foreach(var unit in actor.authored)if(unit.commander)Require(unit.gameObject.activeSelf,culture+": commander hidden",errors,ref checks);
                    actor.SetWideView(false);foreach(var soldier in actor.soldiers)Require(soldier.activeSelf,culture+": detail view failed to restore a unit",errors,ref checks);
                    var ring=actor.selection.GetComponent<LineRenderer>();
                    Require(ring!=null&&ring.positionCount==48,culture+": selection ring missing",errors,ref checks);
                    actor.SetSelected(true);Require(actor.selection.activeSelf,culture+": selected ring hidden",errors,ref checks);
                    actor.SetSelected(false,true);Require(actor.selection.activeSelf,culture+": hover ring hidden",errors,ref checks);
                    actor.SetSelected(false);Require(!actor.selection.activeSelf,culture+": stale ring after deselection",errors,ref checks);
                }
                foreach(var culture in new[]{"greek","egyptian","norse","chinese","japanese"})foreach(var id in new[]{"academy","barracks","infirmary","forge","oracle","oathhall"})
                {
                    var root=new GameObject("Isolated institution review");root.transform.position=new Vector3(4000,0,4000);roots.Add(root);
                    var district=art.Institution(root.transform,id,culture,5,MythInterfaceTheme.Teal);
                    var renderers=district.GetComponentsInChildren<Renderer>();Require(renderers.Length>0,culture+" "+id+": empty institution",errors,ref checks);
                    foreach(var renderer in renderers)Require(renderer.bounds.max.y<4.5f,culture+" "+id+": exceeds city/fog presentation budget",errors,ref checks);
                }
                foreach(var size in new[]{new Vector2Int(1280,720),new Vector2Int(1920,1080),new Vector2Int(2560,1440)})foreach(float scale in new[]{.85f,1f,1.15f})
                {
                    var layout=new WorldLabelLayout();layout.Reset(new Rect(0,0,size.x,size.y));
                    var wanted=new Rect(size.x/2f-80*scale,size.y/2f-14*scale,160*scale,28*scale);
                    bool first=layout.TryPlace(wanted,4*scale,null,out var one),second=layout.TryPlace(wanted,4*scale,null,out var two);
                    Require(first&&second&&!one.Overlaps(two),size+": overlapping labels at "+scale,errors,ref checks);
                    layout.Reset(new Rect(0,0,size.x,size.y));Require(!layout.TryPlace(wanted,4*scale,p=>true,out _),size+": labels cover blocked HUD",errors,ref checks);
                    layout.Reset(new Rect(0,0,size.x,size.y));Require(layout.TryPlace(new Rect(-40,30,150,28),4,null,out var edge)&&edge.xMin>=0,size+": edge label clipped",errors,ref checks);
                }
            }
            finally
            {
                foreach(var root in roots){root.SetActive(false);UnityEngine.Object.Destroy(root);}art.Dispose();
            }
            var report=new Result{unityVersion=Application.unityVersion,checks=checks,success=errors.Count==0,errors=errors.ToArray()};
            string folder=Path.GetFullPath(Path.Combine(Application.dataPath,"../..","work/native-visual-review"));Directory.CreateDirectory(folder);File.WriteAllText(Path.Combine(folder,"map-readability.json"),JsonUtility.ToJson(report,true));
            if(errors.Count>0)throw new InvalidOperationException("Presentation review failed: "+errors[0]+". Report: "+folder);
            Debug.Log("Map readability contracts passed "+checks+" checks. Rendered Windows review remains required. Report: "+folder);
        }
    }
}
