namespace ThronesOfMyth
{
    // Order of existing pages retained; these values are not persisted to server saves.
    public enum InterfacePage { World, City, Training, Research, Temple, Heroes, Alliance, Chronicle, Forge, Market, Marches, Formation, Hospital, Reports, Chat, Warfare, Exploration, Campaign, Activity, Kingdom, Settings, Account, Inventory, Rankings, Menu }
    public sealed class NavigationEntry
    {
        public readonly InterfacePage Page;
        public readonly string Title,Icon,Hint;
        public readonly int Group;
        public NavigationEntry(InterfacePage page,string title,string icon,string hint,int group){Page=page;Title=title;Icon=icon;Hint=hint;Group=group;}
    }
    public static class GameNavigation
    {
        public static readonly string[] Groups={"CIVILIZATION","ARMIES & HEROES","KINGDOM & COMMUNITY"};
        public static readonly NavigationEntry[] Entries={
            new NavigationEntry(InterfacePage.City,"City","city","Build and upgrade institutions · C",0),
            new NavigationEntry(InterfacePage.Training,"Train & promote","army","Recruit reserves and advance troop tiers",0),
            new NavigationEntry(InterfacePage.Research,"Research","research","Choose an Athenaeum technology",0),
            new NavigationEntry(InterfacePage.Temple,"Temple of Echoes","temple","Offer sigils and invoke commanders",0),
            new NavigationEntry(InterfacePage.Forge,"Forge","forge","Craft and equip relics",0),
            new NavigationEntry(InterfacePage.Market,"Market","gold","Exchange resources",0),
            new NavigationEntry(InterfacePage.Inventory,"Inventory","inventory","Supplies and earned speedups",0),
            new NavigationEntry(InterfacePage.Marches,"Marches & reserves","army","Manage field armies and ready troops",1),
            new NavigationEntry(InterfacePage.Formation,"Prepare a march","army","Choose commander and troop quantities",1),
            new NavigationEntry(InterfacePage.Heroes,"Commanders","heroes","Skills, stars and equipment · K",1),
            new NavigationEntry(InterfacePage.Hospital,"Healing","temple","Treat wounded troops",1),
            new NavigationEntry(InterfacePage.Warfare,"Rallies & garrisons","alliance","Coordinate alliance warfare",1),
            new NavigationEntry(InterfacePage.Exploration,"Scouts & discovery","chronicle","Survey unexplored territory",1),
            new NavigationEntry(InterfacePage.Reports,"Reports","chronicle","Battles, deliveries, scouting and alliance events",1),
            new NavigationEntry(InterfacePage.Alliance,"Alliance","alliance","Members, territory and assistance · L",2),
            new NavigationEntry(InterfacePage.Campaign,"Campaign","chronicle","Follow the next chapter objective",2),
            new NavigationEntry(InterfacePage.Activity,"Daily & weekly","chronicle","Earn activity and contribution rewards",2),
            new NavigationEntry(InterfacePage.Kingdom,"Kingdom milestones","temple","Gate openings and sanctuary progress",2),
            new NavigationEntry(InterfacePage.Chat,"Chat","chronicle","Kingdom and alliance conversation",2),
            new NavigationEntry(InterfacePage.Chronicle,"Chronicle","chronicle","Your kingdom journal",2),
            new NavigationEntry(InterfacePage.Rankings,"Rankings","alliance","Player and alliance power",2),
            new NavigationEntry(InterfacePage.Account,"Account","heroes","Protect and recover your city",2),
            new NavigationEntry(InterfacePage.Settings,"Settings & controls","chronicle","Accessibility, connection and shortcuts",2)
        };
        public static string Title(InterfacePage page){foreach(var entry in Entries)if(entry.Page==page)return entry.Title;return page==InterfacePage.Menu?"Kingdom menu":"World";}
    }
}
