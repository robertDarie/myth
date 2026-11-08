namespace ThronesOfMyth
{
    public static class CityPresentationData
    {
        private static bool Matches(QueueJob job,string id) => job!=null&&!string.IsNullOrEmpty(job.id)&&(job.targetId==id||job.type=="upgrade"&&id=="citadel");
        public static QueueJob Construction(ArmyData city,string id)
        {
            if(Matches(city.construction,id))return city.construction;
            return Matches(city.secondConstruction,id)?city.secondConstruction:null;
        }
        public static QueueJob Job(ArmyData city,string id)
        {
            if(Matches(city.construction,id))return city.construction;
            if(Matches(city.secondConstruction,id))return city.secondConstruction;
            if(id=="academy")return city.research;
            if(id=="forge")return city.crafting;
            if(id=="menagerie"&&city.trainingQueue!=null&&city.trainingQueue.Length>0&&city.trainingQueue[0].type=="recruit")return city.trainingQueue[0];
            if(id=="barracks"&&city.trainingQueue!=null&&city.trainingQueue.Length>0)return city.trainingQueue[0];
            return null;
        }
    }
}
