Shader "ThronesOfMyth/Vegetation" {
 Properties { _Color("Canopy pigment",Color)=(.3,.45,.23,1) }
 SubShader {
 Tags {"RenderType"="Opaque" "Queue"="Geometry"}
 Pass {
 Tags {"LightMode"="ForwardBase"}
 CGPROGRAM
 #pragma vertex vert
 #pragma fragment frag
 #pragma multi_compile_fwdbase
 #include "UnityCG.cginc"
 #include "Lighting.cginc"
 #include "AutoLight.cginc"
 struct appdata {float4 vertex:POSITION;float3 normal:NORMAL;};
 struct v2f {float4 pos:SV_POSITION;float3 normal:TEXCOORD0;SHADOW_COORDS(1)};
 fixed4 _Color;
 v2f vert(appdata v){v2f o;o.pos=UnityObjectToClipPos(v.vertex);o.normal=UnityObjectToWorldNormal(v.normal);TRANSFER_SHADOW(o);return o;}
 fixed4 frag(v2f i):SV_Target {
 float3 n=normalize(i.normal);float hemi=saturate(n.y*.5+.5);
 // Explicit pigment illumination avoids dependence on a stale runtime SH probe.
 float3 ambient=lerp(float3(.20,.23,.17),float3(.48,.55,.56),hemi);
 float direct=saturate(dot(n,normalize(_WorldSpaceLightPos0.xyz)));
 float shadow=SHADOW_ATTENUATION(i);
 return fixed4(_Color.rgb*(ambient+_LightColor0.rgb*direct*shadow*.75),1);
 }
 ENDCG
 }
 UsePass "Legacy Shaders/VertexLit/SHADOWCASTER"
 } Fallback "Diffuse"
}
