//@FX
//defined: component, node, scene, transform, globals
this.high_precision = false;
this.enable = false;

//sss parameters
this.createProperty("sss_level", 100, {min: 0.0, max: 1000.0, type: LS.TYPES.NUMBER, widget: "slider"});
this.createProperty("sss_correction", 800, {min: 0.0, max: 2000.0, type: LS.TYPES.NUMBER, widget: "slider"});
this.createProperty("sss_maxdd", 0.001, {min: 0.0, max: 0.01, type: LS.TYPES.NUMBER, step: 0.001, precision: 3, widget: "slider"});

var irradFrame = new LS.RenderFrameContext();
irradFrame.width = 0;
irradFrame.height = 0;
irradFrame.format = gl.RGB;
irradFrame.filter_texture = true;
irradFrame.use_depth_texture = false;
irradFrame.num_extra_textures = 2;
irradFrame.name = ":irrad";

this.irradFrame = irradFrame;

var sssHFrame = new LS.RenderFrameContext();
sssHFrame.width = 0;
sssHFrame.height = 0;
sssHFrame.format = gl.RGB;
sssHFrame.filter_texture = true;
sssHFrame.use_depth_texture = false;
sssHFrame.num_extra_textures = 0;
sssHFrame.name = ":sssH";

var sssVFrame = new LS.RenderFrameContext();
sssVFrame.width = 0;
sssVFrame.height = 0;
sssVFrame.format = gl.RGB;
sssVFrame.filter_texture = true;
sssVFrame.use_depth_texture = false;
sssVFrame.num_extra_textures = 0;
sssVFrame.name = ":sssV";

var sssFFrame = new LS.RenderFrameContext();
sssFFrame.width = 0;
sssFFrame.height = 0;
sssFFrame.format = gl.RGB;
sssFFrame.filter_texture = true;
sssFFrame.use_depth_texture = false;
sssFFrame.num_extra_textures = 0;
sssFFrame.name = ":sssF";

var sss_horizontal_shader_name = "evalls/demos/VirtualClerk/data/shaders/horizontal_blur_shader.glsl";
var sss_vertical_shader_name = "evalls/demos/VirtualClerk/data/shaders/vertical_blur_shader.glsl";
var sss_acc_shader_name = "evalls/demos/VirtualClerk/data/shaders/acc_shader.glsl";

LS.ResourcesManager.load(sss_horizontal_shader_name);
LS.ResourcesManager.load(sss_vertical_shader_name);
LS.ResourcesManager.load(sss_acc_shader_name);

this.onEnableFrameContext = function(){
  irradFrame.precision = this.high_precision ? LS.RenderFrameContext.MEDIUM_PRECISION : 0;
  irradFrame.enable();
  gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
  gl.blendFunc( gl.ONE, gl.ONE );
}

this.horizontalStep = function(irrad_sss_tex, depth_aux_tex, global_uniforms){
  gl.disable(gl.BLEND);
  var shader_code = LS.RM.getResource( sss_horizontal_shader_name, LS.ShaderCode );

	if(!irrad_sss_tex || !depth_aux_tex || !shader_code)
  {
    return;
  }
 
 	var shader = shader_code.getShader("fx");
  if(!shader)
  {
    return;
  }
  global_uniforms.u_irrad_texture = irrad_sss_tex.bind(0);
  global_uniforms.u_depth_aux_texture = depth_aux_tex.bind(1);
  shader.uniforms( global_uniforms );

  var mesh = GL.Mesh.getScreenQuad();
  shader.draw( mesh, gl.TRIANGLES );
}

this.verticalStep = function(irrad_sss_tex, depth_aux_tex, global_uniforms){
  gl.disable(gl.BLEND);
  var shader_code = LS.RM.getResource( sss_vertical_shader_name, LS.ShaderCode );

	if(!irrad_sss_tex || !depth_aux_tex || !shader_code)
  {
    return;
  }
 
 	var shader = shader_code.getShader("fx");
  if(!shader)
  {
    return;
  }
  global_uniforms.u_irrad_texture = irrad_sss_tex.bind(0);
  global_uniforms.u_depth_aux_texture = depth_aux_tex.bind(1);
  shader.uniforms( global_uniforms );

  var mesh = GL.Mesh.getScreenQuad();
  shader.draw( mesh, gl.TRIANGLES );
}

this.accStep = function(color_texture, depth_aux_tex, weight, srcBlend){
  gl.enable(gl.BLEND);
  gl.blendFunc( srcBlend || gl.ONE, gl.ONE );
  
  var shader_code = LS.RM.getResource( sss_acc_shader_name, LS.ShaderCode );
  if(!color_texture || !shader_code) return;
  var shader = shader_code.getShader("fx");
  if(!shader) return;
  
  var global_uniforms = {
    u_weight: weight,
    u_color_texture: color_texture.bind(0),
    u_depth_aux_tex: depth_aux_tex.bind(1)
  }  
  
  shader.uniforms(global_uniforms);
  var mesh = GL.Mesh.getScreenQuad();
  shader.draw( mesh, gl.TRIANGLES );
}

this.finalRender = function(finalFrame){
  var fxComp = node.getComponent("FXGraphComponent");
  fxComp.applyGraphToRenderFrameContext(finalFrame);
}

this.onShowFrameContext = function(){
	irradFrame.disable();
  gl.disable(gl.DEPTH_TEST);
  
  if(!this.enable){
    this.finalRender(irradFrame);
    return;
  }
  
  var irrad_tex = irradFrame.getColorTexture();
  var spec_trans_tex = irradFrame.getColorTexture(1);
  var depth_aux_tex = irradFrame.getColorTexture(2);
  
  //SSS: Each sss pass has three steps: horizontal, vertical and accumulate
  var camera = LS.Renderer._current_camera;
  var camera_params = [camera.near, camera.far];
  var V = [0.0064, 0.0516, 0.2719, 2.0062];
  var RGB = [[0.2405, 0.4474, 0.6157], [0.1158, 0.3661, 0.3439], [0.1836, 0.1864, 0.0], [0.46, 0.0, 0.0402]];
  var pv = 0;
  var global_uniforms = {
    u_sssLevel: this.sss_level,
    u_correction: this.sss_correction,
    u_maxdd: this.sss_maxdd,
    u_invPixelSize: [1/irradFrame.getColorTexture().width, 1/irradFrame.getColorTexture().height],
    u_width: 0.0,
    u_camera_params: camera_params
  }
  
  sssFFrame.enable();
  gl.clear(gl.COLOR_BUFFER_BIT);
  sssFFrame.disable();
  
  var irrad_sss_tex = irrad_tex;
  for(var i = 0; i < 4; i++){
    global_uniforms.u_width = Math.sqrt(V[i]-pv);
    pv = V[i];
    
    sssHFrame.enable();
    this.horizontalStep(irrad_sss_tex, depth_aux_tex, global_uniforms);
    sssHFrame.disable();
    irrad_sss_tex = sssHFrame.getColorTexture();
    
    sssVFrame.enable();
    this.verticalStep(irrad_sss_tex, depth_aux_tex, global_uniforms);
    sssVFrame.disable();
    irrad_sss_tex = sssVFrame.getColorTexture();
    
    sssFFrame.enable();
    this.accStep(irrad_sss_tex, depth_aux_tex, RGB[i], gl.SRC_ALPHA);
    sssFFrame.disable();
  }
  
  sssFFrame.enable();
  this.accStep(irrad_tex, depth_aux_tex, [1,1,1], gl.ONE_MINUS_SRC_ALPHA);
  this.accStep(spec_trans_tex, depth_aux_tex, [1,1,1]);
  sssFFrame.disable();

  this.finalRender(sssFFrame);

  return;
}
