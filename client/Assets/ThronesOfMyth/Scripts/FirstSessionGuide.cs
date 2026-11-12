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
    // The four advice flags are remembered per profile so a reconnect cannot walk the guide backward.
    public sealed class FirstSessionGuide
    {
        private readonly Func<string,string,bool> load;
        private readonly Action<string,string,bool> save;
        private bool cityViewed,commanderViewed,armyPrepared,outcomeViewed;
        private string profile;
        public FirstSessionGuide(Func<string,string,bool> load=null,Action<string,string,bool> save=null){this.load=load;this.save=save;}
        public bool CityViewed{get=>cityViewed;set=>Assign("city",ref cityViewed,value);}
        public bool CommanderViewed{get=>commanderViewed;set=>Assign("commander",ref commanderViewed,value);}
        public bool ArmyPrepared{get=>armyPrepared;set=>Assign("army",ref armyPrepared,value);}
        public bool OutcomeViewed{get=>outcomeViewed;set=>Assign("outcome",ref outcomeViewed,value);}
        public void Profile(string identity)
        {
            if(profile==identity)return;
            profile=identity;
            cityViewed=Read("city");commanderViewed=Read("commander");armyPrepared=Read("army");outcomeViewed=Read("outcome");
        }
        private bool Read(string flag)=>load!=null&&profile!=null&&load(profile,flag);
        private void Assign(string flag,ref bool field,bool value)
        {
            if(field==value)return;
            field=value;
            if(profile!=null&&save!=null)save(profile,flag,value);
        }
        private static readonly OpeningCue City=new OpeningCue(1,"Discover your city","Meet your Captain and inspect a district.","city","citadel");
        private static readonly OpeningCue Meet=new OpeningCue(2,"Meet your Frontier Captain","Inspect Rallying Cry, then return to the city to train.","heroes","captain");
        private static readonly OpeningCue Train=new OpeningCue(3,"Train five archers","One archer batch completes the starting patrol.","training");
        private static readonly OpeningCue Prepare=new OpeningCue(4,"Prepare a Scout patrol","Captain, 15 infantry, 5 archers; select the patrol preset.","prepare");
        private static readonly OpeningCue Fight=new OpeningCue(5,"Challenge Forsaken Scouts","Scout toward (20, 20), then select the remembered level 1 camp.","combat","opening-level-one");
        private static readonly OpeningCue Outcome=new OpeningCue(6,"Review your victory","See the real battle reward and commander progress.","outcome");
        private static readonly OpeningCue Home=new OpeningCue(7,"Return to your civilization","Recall the patrol; its deployment slot clears on arrival.","return");
        private static readonly OpeningCue Build=new OpeningCue(8,"Raise the Citadel","Return to the city and advance your first age.","city","citadel");
        public static string Operation(OpeningCue cue)
        {
            if(cue==null)return "none";
            switch(cue.Guide)
            {
                case "prepare":return "formation";
                case "outcome":return "reports";
                case "return":return "return";
                case "city":case "heroes":case "training":case "combat":case "temple":case "exploration":case "research":
                case "marches":case "alliance":case "warfare":case "territory":case "gather":case "patrol":return "navigate";
                default:return "unknown";
            }
        }
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
            var step=Step(city,army,home);
            bool wounded=army.recovery>0||home&&army.maxHealth>0&&army.health<army.maxHealth;
            if(!wounded)return step;
            // Keep the real stage number. Recovery used to report 7, so a wounded early stage looked finished and then fell backward.
            return new OpeningCue(step?.Number??8,"Recover at home","Wait for recovery; city work can continue.","city","citadel");
        }
        private OpeningCue Step(ArmyData city,ArmyData army,bool home)
        {
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
