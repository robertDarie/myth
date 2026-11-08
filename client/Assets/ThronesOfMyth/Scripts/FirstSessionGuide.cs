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
        public bool CityViewed,ArmyPrepared,OutcomeViewed;
        private string profile;
        public void Profile(string identity){if(profile==identity)return;profile=identity;CityViewed=ArmyPrepared=OutcomeViewed=false;}
        private static readonly OpeningCue City=new OpeningCue(1,"Discover your city","Select a district to inspect and upgrade.","city","citadel");
        private static readonly OpeningCue Build=new OpeningCue(2,"Raise the Citadel","Advance an age; unlock a second march.","city","citadel");
        private static readonly OpeningCue Train=new OpeningCue(3,"Train reserves","Train two batches of five into reserves.","training");
        private static readonly OpeningCue Prepare=new OpeningCue(4,"Commander & troops","Edit at home; add your ready reserves.","prepare");
        private static readonly OpeningCue Wood=new OpeningCue(5,"Gather timber","Select a grove, then choose Gather.","gather","wood");
        private static readonly OpeningCue Food=new OpeningCue(6,"Gather food","Gather food while your city works.","gather","food");
        private static readonly OpeningCue Fight=new OpeningCue(7,"Challenge a camp","Inspect an available level 1 camp.","combat","opening-level-one");
        private static readonly OpeningCue Outcome=new OpeningCue(8,"Review the outcome","Review results, XP, treasury and wounds.","outcome");
        private static readonly OpeningCue Home=new OpeningCue(9,"Return and grow","Return survivors home to recover.","return");
        private static readonly OpeningCue Recover=new OpeningCue(9,"Recover at home","Wait for recovery; city work can continue.","city","citadel");
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
            if(city.kills>0){if(!OutcomeViewed)return Outcome;return !home&&army.recovery<=0?Home:null;}
            int trained=Progress(city,"train-ten"),wood=Progress(city,"gather-wood"),food=Progress(city,"gather-food");
            if(!CityViewed&&city.cityLevel==1&&trained==0&&wood==0&&food==0)return City;
            bool building=city.construction!=null&&!string.IsNullOrEmpty(city.construction.id)||city.secondConstruction!=null&&!string.IsNullOrEmpty(city.secondConstruction.id);
            if(city.cityLevel<2&&!building&&wood==0)return Build;
            int queued=0;if(city.trainingQueue!=null)foreach(var job in city.trainingQueue)if(job.type=="train")queued+=job.amount;
            if(trained+queued<10)return Train;
            if(!ArmyPrepared&&home&&wood==0&&food==0)return Prepare;
            if(wood<40)return Wood;if(food<40)return Food;return Fight;
        }
    }
}
