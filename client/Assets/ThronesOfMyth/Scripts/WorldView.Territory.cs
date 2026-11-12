using UnityEngine;

namespace ThronesOfMyth
{
    public sealed partial class WorldView
    {
        public bool showSupply = true;
        private Transform supplyRoot;
        private string supplySignature = "";

        private void DrawSupply(WorldSnapshot world, string allianceId)
        {
            float radius = TerritoryReach.Radius(world);
            string signature = showSupply ? radius + "|" + (allianceId ?? "") + "|" : "hidden";
            if (showSupply && world?.flags != null)
            {
                foreach (var flag in world.flags)
                {
                    if (!TerritoryReach.Live(flag)) continue;
                    signature += flag.id + ":" + flag.x + ":" + flag.z + ":" + flag.allianceId + ";";
                }
            }
            if (signature == supplySignature) return;
            supplySignature = signature;
            ClearSupplyRings();
            if (!showSupply || radius <= 0 || world?.flags == null) return;
            if (supplyRoot == null)
            {
                var holder = new GameObject("Supply reach");
                holder.transform.SetParent(transform, false);
                supplyRoot = holder.transform;
            }
            foreach (var flag in world.flags)
            {
                if (!TerritoryReach.Live(flag)) continue;
                bool own = !string.IsNullOrEmpty(allianceId) && flag.allianceId == allianceId;
                var ring = art.Ring(supplyRoot, radius, own ? blue : red, 0.14f);
                ring.transform.localPosition = new Vector3(flag.x, 0.08f, flag.z);
            }
        }

        private void ClearSupplyRings()
        {
            if (supplyRoot == null) return;
            for (int i = supplyRoot.childCount - 1; i >= 0; i--) Destroy(supplyRoot.GetChild(i).gameObject);
        }

        private void ClearSupply()
        {
            supplySignature = "";
            if (supplyRoot == null) return;
            Destroy(supplyRoot.gameObject);
            supplyRoot = null;
        }
    }
}
