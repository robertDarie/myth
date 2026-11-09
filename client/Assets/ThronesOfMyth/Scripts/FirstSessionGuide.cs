using System;
namespace ThronesOfMyth
{
    public sealed class OpeningCue
    {
        public readonly int Number;
        public readonly string Title,Hint,Guide,Target;
        public OpeningCue(int number,string title,string hint,string guide,string target=""){Number=number;Title=title;Hint=hint;Guide=guide;Target=target;}
    }
    // Optional UI advice, not a second quest ledger. Actual campaign progress remains server-owned.
    public sealed class FirstSessionGuide
    {
        public bool CityViewed,CommanderViewed,ArmyPrepared,OutcomeViewed;
        private string profile;
        public void Profile(string identity){if(profile==identity)return;profile=identity;CityViewed=CommanderViewed=ArmyPrepared=OutcomeViewed=false;}
        private static readonly OpeningCue City=new OpeningCue(1,"Discover your city","Meet your Captain and inspect a district.","city","citadel");
        private static readonly OpeningCue Meet=new OpeningCue(2,"Meet your Frontier Captain","Inspect Rallying Cry, then return to the city to train.","heroes","captain");
        private static readonly OpeningCue Train=new OpeningCue(3,"Train five archers","One archer batch completes the starting patrol.","training");
        private static readonly OpeningCue Prepare=new OpeningCue(4,"Prepare a Scout patrol","Captain, 15 infantry, 5 archers; select the patrol preset.","prepare");
        private static readonly OpeningCue Fight=new OpeningCue(5,"Challenge Forsaken Scouts","Scout toward (20, 20), then select the remembered level 1 camp.","combat","opening-level-one");
        private static readonly OpeningCue Outcome=new OpeningCue(6,"Review your victory","See the real battle reward and commander progress.","outcome");
        private static readonly OpeningCue Home=new OpeningCue(7,"Return to your civilization","Recall the patrol; its deployment slot clears on arrival.","return");
        private static readonly OpeningCue Build=new OpeningCue(8,"Raise the Citadel","Return to the city and advance your first age.","city","citadel");
        private static readonly OpeningCue Recover=new OpeningCue(7,"Recover at home","Wait for recovery; city work can continue.","city","citadel");
        public static int Progress(ArmyData city,string id)
        {
            if(city?.journeyCampaign?.chapters==null)return 0;
            foreach(var chapter in city.journeyCampaign.chapters)foreach(var task in chapter.tasks)if(task.id==id)return task.progress;
            return 0;
        }
        public OpeningCue Next(ArmyData city,ArmyData army)
        {
            if(city?.journeyCampaign==null||city.journeyCampaign.complete||city.cityLevel>=3||city.kills>=3||army==null)return null;
            float dx=army.x-city.homeX,dz=army.z-city.homeZ;bool home=dx*dx+dz*dz<4;
            if(army.recovery>0||home&&army.health<army.maxHealth)return Recover;
            if(city.kills>0){if(!OutcomeViewed)return Outcome;if(!home)return Home;return city.cityLevel<2?Build:null;}
            if(!CityViewed&&city.cityLevel==1)return City;
            if(!CommanderViewed&&city.cityLevel==1)return Meet;
            int archers=(city.reserveUnits?.Archers??0)+(army.units?.Archers??0);
            if(archers<5)return Train;
            if(!ArmyPrepared&&home)return Prepare;
            return Fight;
        }
    }
}
