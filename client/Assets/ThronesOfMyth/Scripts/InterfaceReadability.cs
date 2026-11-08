using System;
namespace ThronesOfMyth
{
    public static class InterfaceReadability
    {
        // Existing logical layouts stay intact; important text has a physical-size floor.
        public static int FontSize(int designSize,float physicalMinimum,float scale) => Math.Max(designSize,(int)Math.Ceiling(physicalMinimum/Math.Max(.4f,scale)));
    }
}
