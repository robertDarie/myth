namespace ThronesOfMyth
{
    public static class CityPresentationData
    {
        private static bool Matches(QueueJob job,string id) => job!=null&&!string.IsNullOrEmpty(job.id)&&(job.targetId==id||job.type=="upgrade"&&id=="citadel");
        public static QueueJob Job(ArmyData city,string id)
        {
            if(Matches(city.construction,id))return city.construction;
            if(Matches(city.secondConstruction,id))return city.secondConstruction;
            if(id=="academy")return city.research;
            if(id=="forge")return city.crafting;
            if(id=="barracks"&&city.trainingQueue!=null&&city.trainingQueue.Length>0)return city.trainingQueue[0];
            return null;
        }
    }
}
