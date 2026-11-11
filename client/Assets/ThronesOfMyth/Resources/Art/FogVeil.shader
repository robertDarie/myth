Shader "ThronesOfMyth/KingdomVeil" {
 Properties { _Drift("Cloud drift",Float)=1 _Exploration("Unknown sectors",2D)="white"{} }
 SubShader { Tags {"Queue"="Overlay-100" "RenderType"="Transparent"} Blend SrcAlpha OneMinusSrcAlpha ZWrite Off ZTest Always Cull Off
 Pass { CGPROGRAM
 #pragma vertex vert
 #pragma fragment frag
 #include "UnityCG.cginc"
 struct appdata {float4 vertex:POSITION;float2 uv:TEXCOORD0;};
 struct v2f {float4 pos:SV_POSITION;float2 uv:TEXCOORD0;};
 float _Drift;sampler2D _Exploration;
 v2f vert(appdata v){v2f o;o.pos=UnityObjectToClipPos(v.vertex);o.uv=v.uv;return o;}
 fixed4 frag(v2f i):SV_Target {
 // Point-sampled sectors: no semi-fogged explored land or transparent unknown edge.
 clip(tex2D(_Exploration,i.uv).r-.5);
 float2 p=i.uv*80;float t=_Time.y*.025*_Drift;
 float cloud=sin(p.x*.43+sin(p.y*.31)+t)*sin(p.y*.24-t);
 return fixed4(float3(.12,.20,.25)+cloud*.022,1);
 }
 ENDCG }
 } Fallback Off
}
