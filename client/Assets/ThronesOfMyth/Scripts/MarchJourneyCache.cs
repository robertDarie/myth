using System.Collections.Generic;
namespace ThronesOfMyth
{
    // DTOs are replaced by each authoritative snapshot; never cache across worlds/profiles.
    public sealed class MarchJourneyCache
    {
        private object snapshot;
        private readonly Dictionary<ArmyData,string> text=new Dictionary<ArmyData,string>();
        public int Count=>text.Count;
        public void Begin(object next){if(ReferenceEquals(snapshot,next))return;snapshot=next;text.Clear();}
        public string Status(ArmyData army){if(army==null)return MarchJourney.Status(null);if(text.TryGetValue(army,out var value))return value;if(text.Count>=5)text.Clear();value=MarchJourney.Status(army);text[army]=value;return value;}
    }
}
