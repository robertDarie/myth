using System;
namespace ThronesOfMyth
{
    public static class TextElision
    {
        public static string Fit(string text,float width,Func<string,float> measure)
        {
            text=text??"";
            if(width<=0)return "";
            if(measure(text)<=width)return text;
            const string suffix="…";
            if(measure(suffix)>width)return "";
            int low=0,high=text.Length;
            while(low<high)
            {
                int middle=(low+high+1)/2;
                if(measure(text.Substring(0,middle)+suffix)<=width)low=middle;else high=middle-1;
            }
            // Never split a surrogate pair at the truncation boundary.
            if(low>0&&low<text.Length&&char.IsHighSurrogate(text[low-1])&&char.IsLowSurrogate(text[low]))low--;
            return text.Substring(0,low)+suffix;
        }
    }
}
