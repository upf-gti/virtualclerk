function SubsurfaceNode(){
  this.addInput("scene_tex", "Texture");
  this.addInput("depth_tex", "Texture");
  this.addInput("mask_tex", "Texture");
  this.addInput("camera", "Camera");
  this.addInput("scale", "number");
  this.addOutput("out", "Texture");
  
  this.properties = {
    precision: LGraphTexture.DEFAULT,
    blur_scale: 300,
    blur_correction: 800,
    blur_maxdd: 0.001,
    show_textures: false,
  };
  
  this._pingTex = null;
  this._pongTex = null;
  this._outTex = null;
}

SubsurfaceNode.debug = function(){
  debugger;
}

SubsurfaceNode.title = "Subsurface";
SubsurfaceNode.desc = "Applies subsurface scattering in screen-space (FX). Attuned for skin.";

SubsurfaceNode.widgets_info = {
  precision: {widget: "combo", values: LGraphTexture.MODE_VALUES},
  blur_scale: {widget: "slider", min: 0, max: 1000},
  blur_correction: {widget: "slider", min: 0, max: 1000},
  blur_maxdd: {widget: "slider", min: 0, max: 1, precision: 3},
  show_textures: {widget: "checkbox"}
};

SubsurfaceNode.prototype.onExecute = function(){
  if (!this.isOutputConnected(0)) return;

  var sceneTex = this.getInputData(0);
  var depthTex = this.getInputData(1);
  var maskTex  = this.getInputData(2) || GL.Texture.getWhiteTexture();
  var camera = this.getInputData(3) || LS.Renderer._current_camera;
  var scale = this.getInputData(4) || this.properties.blur_scale;

  this.setOutputData(0, sceneTex);
  
  if(this.properties.precision === LGraphTexture.PASS_THROUGH) return;
  if(sceneTex == null || depthTex == null || scale == 0.0) return;
  
  var width = sceneTex.width;
  var height = sceneTex.height;
  var type = LGraphTexture.getTextureType( this.properties.precision, sceneTex );
  var mode = this.properties.precision;
  if(mode === LGraphTexture.REUSE) mode = LGraphTexture.COPY; //Avoid reading and writing to same texture
  
  this._pingTex = LGraphTexture.getTargetTexture( sceneTex, this._pingTex, mode );
  this._pongTex = LGraphTexture.getTargetTexture( sceneTex, this._pongTex, mode );
  this._outTex  = LGraphTexture.getTargetTexture( sceneTex, this._outTex, mode );
  if(this._pingTex == this._pongTex || this._pingTex == this._outTex || this._outTex == sceneTex){
    console.error("SubsurfaceNode: internal textures and input texture should all be different.");
    return false;
  }
  
  var V = [0.0064, 0.0516, 0.2719, 2.0062];
  var RGB = [[0.2405, 0.4474, 0.6157], [0.1158, 0.3661, 0.3439], [0.1836, 0.1864, 0.0], [0.46, 0.0, 0.0402]];
  var pv = 0;
  
  var horizontal_blur_shader = SubsurfaceNode._horizontalBlurShader;
  var vertical_blur_shader = SubsurfaceNode._verticalBlurShader;
  var acc_shader = SubsurfaceNode._accPassShader;
  
  if(!horizontal_blur_shader || !vertical_blur_shader || !acc_shader) return;
  
  var blur_uniforms = {
    u_sssLevel: scale,
    u_correction: this.properties.blur_correction,
    u_maxdd: this.properties.blur_maxdd,
    u_invPixelSize: [1/sceneTex.width, 1/sceneTex.height],
    u_width: 0.0,
    u_camera_params: [camera.near, camera.far],
    u_color_texture: 0,
    u_depth_texture: 1
  }
  
  var acc_uniforms = {
    u_weight: [1,1,1],
    u_color_texture: 0,
    u_aux_texture: 2
  }
  
  var mesh = GL.Mesh.getScreenQuad();
  
  //Constant textures, no need to re-bind
  depthTex.bind(1);
  maskTex.bind(2);
  
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.STENCIL_TEST);
  gl.enable(gl.BLEND);
  
  var colorTex = sceneTex; //First iteration feeds from sceneTex, next iterations use previous iteration result
  
  this._outTex.drawTo(function(){
    gl.clear(gl.COLOR_BUFFER_BIT); //Clear _outTex before drawing SSS results
  	gl.blendFunc( gl.ONE_MINUS_SRC_ALPHA, gl.ONE );
    colorTex.bind(0);
    acc_shader
    	.uniforms(acc_uniforms)
    	.draw(mesh);
  });
  
  for(var i = 0; i < 4; i++){
    blur_uniforms.u_width = Math.sqrt(V[i]-pv);
    pv = V[i];
    
    gl.disable(gl.BLEND);
    
    this._pingTex.drawTo(function(){ 
      colorTex.bind(0);
      horizontal_blur_shader
      	.uniforms(blur_uniforms)
      	.draw(mesh);
    });
    colorTex = this._pingTex;
    
    this._pongTex.drawTo(function(){
      colorTex.bind(0);
      vertical_blur_shader
      	.uniforms(blur_uniforms)
      	.draw(mesh);
    });
    colorTex = this._pongTex;
    
    gl.enable(gl.BLEND);
    
    this._outTex.drawTo(function(){
  		gl.blendFunc( gl.SRC_ALPHA, gl.ONE );
      colorTex.bind(0);
      acc_uniforms.u_weight = RGB[i];
      acc_shader
      	.uniforms(acc_uniforms)
      	.draw(mesh);
    });
  }
  
  gl.disable(gl.BLEND);
  
  if(this.properties.precision === LGraphTexture.REUSE)
  	this._outTex.copyTo(sceneTex);
  else
    this.setOutputData(0, this._outTex);
  
  if(this.properties.show_textures){
    this._pingTex.filename = this.title + "_blurX";
    this._pongTex.filename = this.title + "_blurY";
    this._outTex.filename  = this.title + "_out"
    LS.ResourcesManager.textures[ ":" + this._pingTex.filename ] = this._pingTex;
    LS.ResourcesManager.textures[ ":" + this._pongTex.filename ] = this._pongTex;
    LS.ResourcesManager.textures[ ":" + this._outTex.filename ]  = this._outTex;
  }
}

SubsurfaceNode.getBlurShaderCode = function(isVertical){
  return `
#extension GL_OES_standard_derivatives : enable
  
precision highp float;

varying vec2 v_coord;

uniform float u_width;
uniform float u_sssLevel;
uniform float u_correction;
uniform float u_maxdd;
uniform vec2 u_invPixelSize;
uniform vec2 u_camera_params;

uniform sampler2D u_color_texture;
uniform sampler2D u_depth_texture;

float linearDepthNormalized(float z, float near, float far){
  float z_n = 2.0 * z - 1.0;
  return 2.0 * near * far / (far + near - z_n * (far - near));
}
  
float expFunc(float f){
	return f*f*f*(f*(f*6.0-15.0)+10.0);
}

float getDepth(vec2 v_coord){
  float inv_tex_size = u_invPixelSize.x;
  float tex_size = 1.0/inv_tex_size;
  vec2 topleft_uv = v_coord * tex_size;
  vec2 offset_uv = fract(topleft_uv);
  offset_uv.x = expFunc(offset_uv.x);
  offset_uv.y = expFunc(offset_uv.y);
  topleft_uv = floor(topleft_uv) * inv_tex_size;

  float topleft = texture2D(u_depth_texture, topleft_uv).x;
  float topright = texture2D(u_depth_texture, topleft_uv+vec2(inv_tex_size, 0.0)).x;
  float bottomleft = texture2D(u_depth_texture, topleft_uv+vec2(0.0, inv_tex_size)).x;
  float bottomright = texture2D(u_depth_texture, topleft_uv+vec2(inv_tex_size, inv_tex_size)).x;
  
  float top = mix(topleft, topright, offset_uv.x);
  float bottom = mix(bottomleft, bottomright, offset_uv.x);
  
  float sample_depth = mix(top, bottom, offset_uv.y);
  return linearDepthNormalized( (sample_depth == 1.0) ? 1.0e9 : sample_depth, u_camera_params.x, u_camera_params.y);
}

void main() {
	float w[6];
  w[0] = w[5] = 0.006;
  w[1] = w[4] = 0.061;
  w[2] = w[3] = 0.242;
  float o[6];
  o[0] = -1.0;
  o[1] = -0.667;
  o[2] = -0.333;
  o[3] = 0.333;
  o[4] = 0.667;
  o[5] = 1.0;

  float depth = getDepth(v_coord);
  vec3 color = texture2D(u_color_texture, v_coord).rgb;

  if(depth > 0.0 && depth >= u_camera_params.x && depth <= u_camera_params.y){
    color *= 0.382;
` + (isVertical ? `
		float s_y = u_sssLevel / (depth + u_correction * min(abs(dFdy(depth)), u_maxdd));
    vec2 finalWidth = s_y * u_width * u_invPixelSize * vec2(0.0, 1.0);
` : `
		float s_x = u_sssLevel / (depth + u_correction * min(abs(dFdx(depth)), u_maxdd));
    vec2 finalWidth = s_x * u_width * u_invPixelSize * vec2(1.0, 0.0);
`) + `
		vec2 offset;

    for(int i=0; i<6; i++){
      offset = v_coord + finalWidth*o[i];
      vec3 tap = texture2D(u_color_texture, offset).rgb;
      color.rgb += w[i] * tap;
    }
  }
    
  gl_FragData[0] = vec4(color, 1.0);
}
`;
}

SubsurfaceNode._verticalBlurShader = new Shader( GL.Shader.SCREEN_VERTEX_SHADER, SubsurfaceNode.getBlurShaderCode(true) );
SubsurfaceNode._horizontalBlurShader = new Shader( GL.Shader.SCREEN_VERTEX_SHADER, SubsurfaceNode.getBlurShaderCode(false) );
SubsurfaceNode._accPassShader = new Shader( GL.Shader.SCREEN_VERTEX_SHADER, `
precision highp float;

varying vec2 v_coord;

uniform vec3 u_weight;
uniform sampler2D u_color_texture;
uniform sampler2D u_aux_texture;


void main() {
  vec4 color = texture2D( u_color_texture, v_coord );
  float sssIntensity = texture2D( u_aux_texture, v_coord ).x;
	gl_FragColor = vec4(color.rgb * u_weight, sssIntensity);
}
`);

LiteGraph.registerNodeType("fx/subsurface", SubsurfaceNode);

//TEMPORARY FIX
LGraphTexture.getTargetTexture = function(origin, target, mode) {
		if (!origin) {
			throw "LGraphTexture.getTargetTexture expects a reference texture";
		}

		var tex_type = null;

		switch (mode) {
			case LGraphTexture.LOW:
				tex_type = gl.UNSIGNED_BYTE;
				break;
			case LGraphTexture.HIGH:
				tex_type = gl.HIGH_PRECISION_FORMAT;
				break;
			case LGraphTexture.REUSE:
				return origin;
				break;
			case LGraphTexture.COPY:
			default:
				tex_type = origin ? origin.type : gl.UNSIGNED_BYTE;
				break;
		}

		if (
			!target ||
			target.width != origin.width ||
			target.height != origin.height ||
			target.type != tex_type ||
			target.format != origin.format //added
		) {
			target = new GL.Texture(origin.width, origin.height, {
				type: tex_type,
				//format: gl.RGBA,
				format: origin.format, //added
				filter: gl.LINEAR
			});
		}

		return target;
};