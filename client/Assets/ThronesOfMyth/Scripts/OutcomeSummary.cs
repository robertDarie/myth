using System.Text;
namespace ThronesOfMyth
{
    public static class OutcomeSummary
    {
        public static string Credited(ResourceAmounts value)
        {
            if(value==null)return "Outcome recorded · open Reports";
            var text=new StringBuilder();void Add(int amount,string name){if(amount<=0)return;if(text.Length>0)text.Append(" · ");text.Append(amount).Append(' ').Append(name);}
            Add(value.gold,"gold");Add(value.food,"food");Add(value.wood,"wood");Add(value.stone,"stone");Add(value.mana,"Mana");Add(value.aether,"Aether");
            return text.Length==0?"Outcome recorded · open Reports":"Credited · "+text.ToString();
        }
    }
}
