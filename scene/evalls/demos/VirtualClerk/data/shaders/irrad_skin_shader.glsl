

\js
//define exported uniforms from the shader (name, uniform, widget)
  
//Uniforms
this.createUniform("Specular", "u_specular", LS.TYPES.NUMBER, 1.0, {min:0.0, max:10.0, widget: "slider"});
this.createUniform("Roughness", "u_roughness", LS.TYPES.NUMBER, 0.1, {min: 0.0, max: 1.0, step: 0.01, precision: 2, widget: "slider"});
this.createUniform("Normalmap factor", "u_normalmap_factor", LS.TYPES.NUMBER, 1.0, {min:0.0, max:10.0, widget: "slider"});
this.createUniform("Shadow shrinking", "u_shadow_shrinking", LS.TYPES.NUMBER, 0.05, {min: 0.0, max: 0.5, step: 0.001, precision: 3, widget: "slider"});
this.createUniform("Enable transmittance", "u_enable_translucency", LS.TYPES.BOOLEAN, true);
this.createUniform("Transmittance scale", "u_translucency_scale", LS.TYPES.NUMBER, 150.0, {min: 0.0, max: 10000.0, step: 1, precision: 0});

//Textures
this.createSampler("Albedo Texture","u_color_texture",{ missing:'white' });
this.createSampler("Spec. Texture","u_specular_texture");
this.createSampler("Normal Texture","u_normal_texture",{ missing:'black' });
this.createSampler("Opacity Texture", "u_opacity_texture", {missing: "white"});
this.createSampler("SSS intensity texture", "u_sss_texture", {missing: "black"});
this.createSampler("Transmitance LUT", "u_transmitance_lut_texture", {missing: "black", wrap: gl.CLAMP_TO_EDGE}, "./textures/transmitance_lut.png");
this.createSampler("Specular LUT", "u_specular_lut_texture", {missing: "black", wrap: gl.CLAMP_TO_EDGE}, "./textures/beckmann_lut.png");

this._light_mode = 1;

\color.vs

precision mediump float;
attribute vec3 a_vertex;
attribute vec3 a_normal;
attribute vec2 a_coord;

//varyings
varying vec3 v_pos;
varying vec3 v_normal;
varying vec2 v_uvs;

//matrices
uniform mat4 u_model;
uniform mat4 u_normal_model;
uniform mat4 u_view;
uniform mat4 u_viewprojection;

//globals
uniform float u_time;
uniform vec4 u_viewport;
uniform float u_point_size;

#pragma shaderblock "morphing"
#pragma shaderblock "skinning"

//camera
uniform vec3 u_camera_eye;
void main() {
	
	vec4 vertex4 = vec4(a_vertex,1.0);
	v_normal = a_normal;
	v_uvs = a_coord;
  
  //deforms
  applyMorphing( vertex4, v_normal );
  applySkinning( vertex4, v_normal );
	
	//vertex
	v_pos = (u_model * vertex4).xyz;
  
//  applyLight(v_pos);
  
	//normal
	v_normal = (u_normal_model * vec4(v_normal,0.0)).xyz;
	gl_Position = u_viewprojection * vec4(v_pos,1.0);
}

\color.fs
#extension GL_EXT_draw_buffers : require

precision mediump float;

//varyings
varying vec3 v_pos;
varying vec3 v_normal;
varying vec2 v_uvs;

//globals
uniform vec4 u_background_color;
uniform vec4 u_material_color;

uniform vec3 u_camera_eye;
uniform vec2 u_camera_planes;	// (near, far)

uniform vec3 u_ambient_light;
uniform vec3 u_light_position;
uniform vec3 u_light_front;
uniform vec3 u_light_color;
uniform vec4 u_light_att;
uniform vec4 u_shadow_params;	// (1.0/(texture_size), bias, near, far)
uniform mat4 u_light_matrix;	// Shadowmap viewprojection

uniform float u_specular;
uniform float u_roughness;
uniform float u_normalmap_factor;
uniform float u_shadow_shrinking;
uniform bool  u_enable_translucency;
uniform float u_translucency_scale;

uniform sampler2D u_color_texture;
uniform sampler2D u_specular_texture;
uniform sampler2D u_normal_texture;
uniform sampler2D u_opacity_texture;
uniform sampler2D shadowmap;
uniform sampler2D u_sss_texture;

uniform sampler2D u_transmitance_lut_texture;
uniform sampler2D u_specular_lut_texture;

uniform float u_sss_id;

#pragma shaderblock "firstPass"
#pragma snippet "perturbNormal"



//We asume that the color is gamma-corrected for now
vec3 linearizeColor(vec3 color){
	return pow(color, vec3(2.2));
}

float linearDepthNormalized(float z, float near, float far){
  float z_n = 2.0 * z - 1.0;
  return 2.0 * near * far / (far + near - z_n * (far - near));
}

float expFunc(float f){
	return f*f*f*(f*(f*6.0-15.0)+10.0);
}

float lightDepth(sampler2D light_shadowmap, vec2 sample_uv, float inv_tex_size, float bias, float near, float far){
  float tex_size = 1.0/inv_tex_size;
  vec2 topleft_uv = sample_uv * tex_size;
  vec2 offset_uv = fract(topleft_uv);
  offset_uv.x = expFunc(offset_uv.x);
  offset_uv.y = expFunc(offset_uv.y);
  topleft_uv = floor(topleft_uv) * inv_tex_size;

  float topleft = texture2D(light_shadowmap, topleft_uv).x;
  float topright = texture2D(light_shadowmap, topleft_uv+vec2(inv_tex_size, 0.0)).x;
  float bottomleft = texture2D(light_shadowmap, topleft_uv+vec2(0.0, inv_tex_size)).x;
  float bottomright = texture2D(light_shadowmap, topleft_uv+vec2(inv_tex_size, inv_tex_size)).x;
  
  float top = mix(topleft, topright, offset_uv.x);
  float bottom = mix(bottomleft, bottomright, offset_uv.x);
  
  float sample_depth = mix(top, bottom, offset_uv.y);
  return (sample_depth == 1.0) ? 1.0e9 : sample_depth;
}

vec3 T(float s){
  return texture2D(u_transmitance_lut_texture, vec2(s, 0.0)).rgb;
//Is following equation in range [0,4]:
//  return vec3(0.233, 0.455, 0.649) * exp(-s*s/0.0064) +
//  vec3(0.1, 0.336, 0.344) * exp(-s*s/0.0484) +
//  vec3(0.118, 0.198, 0.0) * exp(-s*s/0.187) +
//  vec3(0.113, 0.007, 0.007) * exp(-s*s/0.567) +
//  vec3(0.358, 0.004, 0.0) * exp(-s*s/1.99) +
//  vec3(0.078, 0.0, 0.0) * exp(-s*s/7.41);
}

float fresnelReflactance(vec3 H, vec3 V, float F0){
	float base = 1.0 - dot(V, H);
	float exponential = pow(base, 5.0);
	return exponential + F0 * (1.0 - exponential);
}

float KS_Skin_Specular(vec3 N, vec3 L, vec3 V, float m, float roh_s){
	float result = 0.0;
	float ndotl = dot(N, L);
	if(ndotl > 0.0){
		vec3 h = L + V;
		vec3 H = normalize(h);
		float ndoth = dot(N, H);
		float PH = pow(2.0*texture2D(u_specular_lut_texture, vec2(ndoth, m)).x, 10.0);
		float F = fresnelReflactance(H, V, 0.028);
		float frSpec = max(PH * F / dot(h, h), 0.0);
		result = ndotl * roh_s * frSpec;
	}
	return result;
}

void main() {
  vec3 N = normalize(v_normal);
  vec3 V = normalize(u_camera_eye - v_pos);
  vec3 detailed_normal = perturbNormal(N, V, v_uvs, texture2D(u_normal_texture, v_uvs).xyz);
	detailed_normal = mix(N, detailed_normal, u_normalmap_factor);
  //u_normalmap_factor
  
  //With directional lights this does not make sense because we should check its intrinsic direction
  vec3 L = (u_light_position - v_pos);
  float light_distance = length(L);
  L /= light_distance;
  float attenuation = 1.0 - (light_distance - u_light_att.x) / (0.001 + u_light_att.y - u_light_att.x);
  L = normalize(-u_light_front);
  
  float NdotL = max(0.0, dot(detailed_normal,L));
  NdotL *= attenuation;
  
	vec3 albedo = u_material_color.rgb * linearizeColor(texture2D(u_color_texture, v_uvs).rgb);
  float specular = u_specular * texture2D(u_specular_texture, v_uvs).x;
  
  float depth = gl_FragCoord.z;
  float sssMask = texture2D(u_sss_texture, v_uvs).x;
  
  //Shadowmap
  float inv_tex_size = u_shadow_params.x;
  float bias = u_shadow_params.y;
  float near = u_shadow_params.z;
  float far = u_shadow_params.w;
  
  vec4 lspace_pos = u_light_matrix * vec4(v_pos - u_shadow_shrinking * N, 1.0); //Shrinking explained by Jimenez et al
  lspace_pos = 0.5*(lspace_pos+vec4(1.0));
  float sample_depth = lightDepth(shadowmap, lspace_pos.xy, inv_tex_size, bias, near, far);
  float real_depth = lspace_pos.z;
  
  float lit = ((real_depth <= sample_depth + bias) ? 1.0 : 0.0);
  
  //Transmitance
  float s = u_translucency_scale * abs(linearDepthNormalized(sample_depth, near, far) - linearDepthNormalized(real_depth, near, far));
  float E = max(0.3 + dot(-N, L), 0.0);
  
  //Final color
  vec3 ambient = vec3(0.0);
  vec3 transmittance = vec3(0.0);
  #ifdef BLOCK_FIRSTPASS
  	ambient = albedo * u_ambient_light;
  #endif
  if(u_enable_translucency)
  		transmittance = T(s) * u_light_color * albedo * E * attenuation;
  vec3 diffuse = albedo * u_light_color * NdotL * lit;
  
  vec3 reflectance = KS_Skin_Specular(detailed_normal, L, V, u_roughness, specular) * u_light_color * lit;
  
  //gl_FragData[0] = vec4(ambient+diffuse+transmittance+reflectance, 1.0);
	gl_FragData[0] = vec4(ambient+diffuse+transmittance+reflectance, 1.0);
  gl_FragData[1] = vec4(0.0);
  gl_FragData[2] = vec4(0.0);
  #ifdef BLOCK_FIRSTPASS
  	gl_FragData[1] = vec4(sssMask, 0.0, 0.0, 1.0);
  #endif
}
