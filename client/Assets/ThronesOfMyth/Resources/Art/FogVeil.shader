Shader "ThronesOfMyth/KingdomVeil" {
 Properties { _Drift("Cloud drift",Float)=1 }
 SubShader { Tags {"Queue"="Transparent+1" "RenderType"="Transparent"} Blend SrcAlpha OneMinusSrcAlpha ZWrite Off Cull Off
 Pass { CGPROGRAM
 #pragma vertex vert
 #pragma fragment frag
 #include "UnityCG.cginc"
 struct appdata {float4 vertex:POSITION;float4 color:COLOR;};
 struct v2f {float4 pos:SV_POSITION;float2 world:TEXCOORD0;float4 color:COLOR;};
 float _Drift;
 v2f vert(appdata v){v2f o;o.pos=UnityObjectToClipPos(v.vertex);o.world=mul(unity_ObjectToWorld,v.vertex).xz;o.color=v.color;return o;}
 fixed4 frag(v2f i):SV_Target {
 float t=_Time.y*.025*_Drift;
 float cloud=sin(i.world.x*.43+sin(i.world.y*.31)+t)*sin(i.world.y*.24-t)+.35*sin((i.world.x+i.world.y)*.75);
 // RGB-only cloud modulation: opaque unknown sectors never acquire transparent holes.
 float3 color=i.color.rgb+cloud*.022;
 return fixed4(color,i.color.a);
 }
 ENDCG }
 } Fallback Off
}
