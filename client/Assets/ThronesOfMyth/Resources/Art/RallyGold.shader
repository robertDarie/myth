Shader "ThronesOfMyth/RallyGold" {
 Properties { _Tint("Gold light",Color)=(1,.74,.26,.4) }
 SubShader { Tags { "Queue"="Transparent+10" "RenderType"="Transparent" } Blend SrcAlpha One ZWrite Off Cull Off
 Pass { CGPROGRAM
 #pragma vertex vert
 #pragma fragment frag
 #include "UnityCG.cginc"
 struct appdata { float4 vertex:POSITION; float3 normal:NORMAL; float4 color:COLOR; };
 struct v2f { float4 pos:SV_POSITION; float3 normal:TEXCOORD0; float3 view:TEXCOORD1; float4 color:COLOR; };
 fixed4 _Tint;
 v2f vert(appdata v) { v2f o; o.pos=UnityObjectToClipPos(v.vertex);o.normal=UnityObjectToWorldNormal(v.normal);o.view=WorldSpaceViewDir(v.vertex);o.color=v.color;return o; }
 fixed4 frag(v2f i):SV_Target { float rim=pow(1-abs(dot(normalize(i.normal),normalize(i.view))),2); return fixed4(_Tint.rgb,_Tint.a*(.12+.88*rim))*i.color; }
 ENDCG }
 } Fallback Off
}
