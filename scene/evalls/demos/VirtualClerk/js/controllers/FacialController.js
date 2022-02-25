//@FacialController

function FacialController(o) {
  //define some properties
  this.headNode = {};
  this.lookAtEyes = {};
  this.lookAtHead = {};
  this.lookAtNeck = {};
 	this.gazePositions = {
    "RIGHT": [70, 100, 400], "LEFT": [-70, 100, 400],
    "UP": [0, 130, 400], "DOWN": [0, 80, 400],
    "UPRIGHT": [70, 130, 400], "UPLEFT": [-70, 130, 400],
    "DOWNRIGHT": [70, 80, 400], "DOWNLEFT": [-70, 80, 400],
    "CAMERA": [0, 100, 400]
  };
	// Blend shapes index
	
  this.smileBSName = "Smile";
  this.sadBSName = "Sad";
  this.kissBSName = "MouthWhistle";
  this.lipsPressedBSName = "Jaw_Up";
  this.lowerLipINBSName = "LowerLipIn";
  this.lowerLipDownBSName = "LowerLipDown";
  this.mouthNarrowBSName = "MouthNarrow";
  this.mouthOpenBSName = "MouthOpen";
  this.tongueBSName = "Tongue";

  this.browsDownBSName= "BrowsDown";
  this.browsInnerUpBSName = "BrowsIn";
  this.browsUpBSName = "BrowsUp";
  this.eyelidsBSName = "Blink";
  this.squintBSName = "Squint";
  this.browsDownInnerBSName={};
	
  this._Blink = null;
  this._blinking = false;
  // Blend shapes factor
  this.sadFactor = 1;
  this.smileFactor = 1;
  this.lipsClosedFactor = 1;
  this.kissFactor = 1;
  this.browsDownFactor = 1;
  this.browsInnerUpFactor = 1;
  this.browsUpFactor = 1;
  this.jawFactor = 1;
 
  this._FacialLexemes = [];
  //if we have the state passed, then we restore the state
  if(o)
    this.configure(o);
  
 
}

FacialController["@headNode"] = {type: "node_id", value: this.headNode}
FacialController["@lookAtEyes"] = {type: "node_id", value: this.lookAtEyes}
FacialController["@lookAtHead"] = {type: "node_id", value: this.lookAtHead}
FacialController["@lookAtNeck"] = {type: "node_id", value: this.lookAtNeck}

FacialController['@sadFactor'] = {type: "slider", max: 1, min: 0.1};
FacialController['@smileFactor'] = {type: "slider", max: 1, min: 0.1};
FacialController['@lipsClosedFactor'] = {type: "slider", max: 1, min: 0.1};
FacialController['@kissFactor'] = {type: "slider", max: 1, min: 0.1};
FacialController['@browsDownFactor'] = {type: "slider", max: 1, min: 0.1};
FacialController['@browsInnerUpFactor'] = {type: "slider", max: 1, min: 0.1};
FacialController['@browsUpFactor'] = {type: "slider", max: 1, min: 0.1};
FacialController['@jawFactor'] = {type: "slider", max: 1, min: 0.1};

//bind events when the component belongs to the scene

FacialController.prototype.onAddedToScene = function(scene)
{
  LEvent.bind(scene, "update", this.onUpdate, this );
  LEvent.bind(scene, "start", this.onStart, this );
   
 
}

//unbind events when the component no longer belongs to the scene
FacialController.prototype.onRemovedFromScene = function(scene)
{
	//bind events
  LEvent.unbind(scene, "update", this.onUpdate, this );
  LEvent.unbind(scene, "start", this.onStart, this );
}

FacialController.prototype.onStart = function()
{
  this.resetFace();
   // Get morph targets
  var children = this._root.childNodes;
  this._morphDeformers = {};
  this._facialBS = {};
  this._eyeLidsBS = []
  this._squintBS = [];
  this.map = {};
  for(var child in children)
  {
    var morphTargets = children[child].getComponent("MorphDeformer");
    if(morphTargets)
    {
      this._morphDeformers[children[child].name] = morphTargets.morph_targets;

      //var eyelidsIx = morphTargets.morph_targets.findIndex(t=>t.mesh.includes(this.eyeLidsBSName));
      var eyelidsIdx = [];
      var squintIdx = [];
      var targets = [];
      for(var i = 0; i<morphTargets.morph_targets.length; i++)
      {
        var name = morphTargets.morph_targets[i].mesh.split("mesh_morph_")[1].replace(".wbin", "");
        if(!this.map[name])
          this.map[name] = {};
        this.map[name][children[child].name] = i;

        targets.push(morphTargets.morph_targets[i].weight);
        if(morphTargets.morph_targets[i].mesh.toLocaleLowerCase().includes(this.eyelidsBSName.toLocaleLowerCase()))
        	eyelidsIdx.push(i)
        
        if(morphTargets.morph_targets[i].mesh.toLocaleLowerCase().includes(this.squintBSName.toLocaleLowerCase()))
          squintIdx.push(i)
      }
      this._eyeLidsBS.push(eyelidsIdx)
      this._squintBS.push(squintIdx)
      this._facialBS[children[child].name] = targets;
    }
  }
  
  
  if (!this._morphDeformers)
  {
    console.error("Morph deformer not found");
    return; 
  }
  
//  this.eyeLidsBS = morphTargets[this.eyeLidsBSIndex];
 /* morphTargets = morphTargets.morph_targets;
  this._blendshapes = morphTargets;
  
  // Get eyeLidsBS
  if (this.eyeLidsBSIndex > morphTargets.length-1){
    console.error("Eye lid index", this.eyeLidsBSIndex ," is not found in: ", morphTargets);
    return; 
  }
	
  this.eyeLidsBS = morphTargets[this.eyeLidsBSIndex];
  
 /* 
  // Get jaw node and initial rotation
  this.jaw = node.scene.getNodeByName (this.jawNodeName);
  
  if (!this.jaw){
    console.error("Jaw node not found with name: ", this.jawNodeName);
    return;
  }
  // Initial rotation
  this._jawInitRotation = vec4.copy(vec4.create(), this.jaw.transform.rotation);
  */
  
  // Gaze
  // Get head bone node

  
  if (!this.headNode)
    console.error("Head bone node not found with id: ");
  else if(!this.gazePositions["HEADARGET"])
  {
    var headNode = LS.GlobalScene.getNodeByUId(this.headNode)
		this.gazePositions["HEADARGET"] = headNode.transform.globalPosition;
   
  }
  LS.GlobalScene.getActiveCameras(true);
  if (LS.GlobalScene._cameras[0])
  	this.gazePositions["CAMERA"] = LS.GlobalScene.getCamera().getEye();
  else
    console.error("Camera position not found for gaze.");
  
  // Get lookAt nodes
  
	var lookAtEyesNode = LS.GlobalScene.getNodeByUId(this.lookAtEyes);
  var lookAtNeckNode =  LS.GlobalScene.getNodeByUId(this.lookAtNeck);
  var lookAtHeadNode = LS.GlobalScene.getNodeByUId(this.lookAtHead);
  
  if (!this.lookAtEyes) 
    console.error("LookAt Eyes not found");
  else if(!this.gazePositions["EYESTARGET"]) 
    this.gazePositions["EYESTARGET"] = lookAtEyesNode.transform.position;
  
  if (!this.lookAtHead) 
    console.error("LookAt Head not found");
  else if( !this.gazePositions["HEADARGET"]) 
    this.gazePositions["HEADARGET"] = lookAtHeadNode.transform.position;
  
  if (!this.lookAtNeck) 
    console.error("LookAt Neck not found");
  else if( !this.gazePositions["NECKTARGET"] )
    this.gazePositions["NECKTARGET"] = lookAtNeckNode.transform.position;


  // Gaze manager
  this.gazeManager = new GazeManager(lookAtNeckNode, lookAtHeadNode, lookAtEyesNode, this.gazePositions);

  /*
  // Head behavior
  // Get lookAt head component
  this._lookAtHeadComponent = this.headBone.getComponents(LS.Components.LookAt)[0];
  if (!this._lookAtHeadComponent)
    console.error("LookAt component not found in head bone. ", this._lookAtHeadComponent, this.headBone);
  */
  this.headBML = null;
  

}
//example of one method called for ever update event
FacialController.prototype.onUpdate = function(e,dt)
{
  LS.GlobalScene.getActiveCameras(true);
  if (LS.GlobalScene._cameras[0])
  {
  	this.gazePositions["CAMERA"] = LS.GlobalScene.getCamera().getEye();
    this.gazePositions["CAMERA"][2] = 400;
  }
  // Update facial expression
  this.faceUpdate(dt);
  // Face blend (blink, facial expressions, lipsync)
  this.facialBlend(dt);
  
  // Gaze
  if (this.gazeManager){
  	var weights = this.gazeManager.update(dt);
    
    var keys = Object.keys(this._facialBS);
    if(weights.eyelids !=undefined && weights.eyelids !=null)
    {
    	this._facialBS[keys[0]][this._eyeLidsBS[0][0]] = weights.eyelids
    	this._facialBS[keys[0]][this._squintBS[0][0]] = weights.squint
    }
  }
  
  // Head behavior
  this.headBMLUpdate(dt);
 
}

// --------------------- BLINK ---------------------
// BML
// <blink start attackPeak relax end amount>

FacialController.prototype.blink = function(blinkData, cmdId){

  blinkData.end = blinkData.end || blinkData.attackPeak * 2 || 0.5;
  
  this.newBlink(blinkData);
  this._blinking = true;
  
/*  // Server response
  if (cmdId) 
    setTimeout(LS.Globals.ws.send.bind(LS.Globals.ws), blinkData.end * 1000, cmdId + ": true");*/
}

// Create blink object
FacialController.prototype.newBlink = function(blinkData){
  var keys = Object.keys(this._morphDeformers);
  this._Blink = new Blink(blinkData, this._morphDeformers[keys[0]][this._eyeLidsBS[0][0]].weight);
}
FacialController.prototype.newLipSync = function (text)
{
  if(!this.lipsync)
  	this.lipsync = new TextToLipsync(text);
  this.lipsync.parse(text);
  this.lipsync.speaking = true;
}
// --------------------- FACIAL BLEND ---------------------
FacialController.prototype.facialBlend = function(dt)
{
  
  // Facial interpolation 
  if (this.FA || this._FacialLexemes.length != 0 ){
    var md = this._morphDeformers;
   /* for(var part in this._morphDeformers)
    {*/
    	for(var i = 0; i<this._morphDeformers["Body"].length; i++)
    	{
        var e = null;
        for(var k in this.map)
        {
          if( i == this.map[k]["Body"])
            e = this.map[k]["Eyelashes"]
        }
        var w = this._facialBS["Body"][i];
      	this._morphDeformers["Body"][i].weight = this._facialBS["Body"][i];
        if(e != null)
          this._morphDeformers["Eyelashes"][e].weight = this._facialBS["Body"][i];
    	}
   // }
  
  }
  
  var smooth = 0.66;

  if(this.lipsync && this.lipsync.speaking)
  {
    var facialLexemes = Object.assign({}, this.lipsync.update(dt) )
    if(facialLexemes )
    {    
      var BS = this._morphDeformers["Body_SSS"]|| this._morphDeformers["Body"];

      for(var i = 0; i<BS.length; i++)
      {
        if(BS[i].mesh.includes(this.mouthOpenBSName))
          BS[i].weight = (1-smooth)*BS[i].weight + smooth*facialLexemes.open_mouth;

        if(BS[i].mesh.includes(this.kissBSName))
          BS[i].weight =  (1-smooth)*BS[i].weight + smooth*facialLexemes.kiss;
        
        if(BS[i].mesh.includes(this.tongueBSName))
          BS[i].weight =  (1-smooth)*BS[i].weight + smooth*facialLexemes.tongue_up;
    
        if(BS[i].mesh.includes(this.lowerLipINBSName))
          BS[i].weight =  (1-smooth)*BS[i].weight + smooth*facialLexemes.lower_lip_in;
        
        if(BS[i].mesh.includes(this.lowerLipDownBSName))
          BS[i].weight =  (1-smooth)*BS[i].weight + smooth*facialLexemes.lower_lip_down;
        
        if(BS[i].mesh.includes(this.mouthNarrowBSName))
          BS[i].weight =  (1-smooth)*BS[i].weight + smooth*facialLexemes.narrow_mouth;
    
        if(BS[i].mesh.includes(this.lipsPressedBSName))
          BS[i].weight =  (1-smooth)*BS[i].weight + smooth*facialLexemes.lips_pressed;
      }
    }
  }
  else if(LS.Globals.lipsyncModule)
  {
    var facialLexemes = LS.Globals.lipsyncModule.BSW 
    if(facialLexemes)
    {
      var BS = this._morphDeformers["Body_SSS"]|| this._morphDeformers["Body"];

      for(var i = 0; i<BS.length; i++)
      {
        if(BS[i].mesh.includes(this.mouthOpenBSName))
          BS[i].weight = (1-smooth)*BS[i].weight + smooth*facialLexemes[2];

        /*if(BS[i].mesh.includes(this.kissBSName))
          BS[i].weight =  (1-smooth)*BS[i].weight + smooth*facialLexemes[0];*/
        
        /*if(BS[i].mesh.includes(this.tongueBSName))
          BS[i].weight =  (1-smooth)*BS[i].weight + smooth*facialLexemes.tongue_up;*/
  
        if(BS[i].mesh.includes(this.lowerLipINBSName))
          BS[i].weight =  (1-smooth)*BS[i].weight + smooth*facialLexemes[1];
        
        if(BS[i].mesh.includes(this.lowerLipDownBSName))
          BS[i].weight =  (1-smooth)*BS[i].weight + smooth*facialLexemes[1];
        
        if(BS[i].mesh.includes(this.mouthNarrowBSName))
          BS[i].weight =  (1-smooth)*BS[i].weight + smooth*facialLexemes[0]*0.5;
  
        if(BS[i].mesh.includes(this.lipsPressedBSName))
          BS[i].weight =  (1-smooth)*BS[i].weight + smooth*facialLexemes[1];
      }
    }
  }
  
 /* // Facial interpolation (low face) if audio is not playing
  if (this._audio.paused && (this.FA || this._FacialLexemes.length != 0) ){
    this._blendshapes[this.sadBSIndex].weight = this._facialBSW[0] * this.sadFactor; // sad
    this._blendshapes[this.smileBSIndex].weight = this._facialBSW[1] * this.smileFactor; // smile
    this._blendshapes[this.lipsClosedBSIndex].weight = this._facialBSW[2] * this.lipsClosedFactor; // lipsClosed
    this._blendshapes[this.kissBSIndex].weight = this._facialBSW[3] * this.kissFactor; // kiss
		
    if(this.jawBSIndex == -1){
   		quat.copy (this._jawRot, this._jawInitRotation);
    	this._jawRot[3] += -this._facialBSW[4] * 0.3 * this.jawFactor; // jaw
    	this.jaw.transform.rotation = quat.normalize(this._jawRot, this._jawRot);
    }
    else
      this._blendshapes[this.jawBSIndex].weight = this._facialBSW[4] * this.jawFactor;

  } 
  // Lipsync
  else if (!this._audio.paused){
    this.updateLipsync();
    
    this._blendshapes[this.smileBSIndex].weight = this._lipsyncBSW[1];
    this._blendshapes[this.mouthAirBSIndex].weight = this._lipsyncBSW[2];
    this._blendshapes[this.lipsClosedBSIndex].weight = this._lipsyncBSW[3];
    this._blendshapes[this.kissBSIndex].weight = this._lipsyncBSW[4] * 2.5;
    this._blendshapes[this.sadBSIndex].weight = this._lipsyncBSW[5];
		
    
    if(this.jawBSIndex == -1){
    	quat.copy (this._jawRot, this._jawInitRotation);
    	this._jawRot[3] += -this._lipsyncBSW[0] * 0.3; // jaw
    	this.jaw.transform.rotation = quat.normalize(this._jawRot, this._jawRot);
    }
    else
      this._blendshapes[this.jawBSIndex].weight = this._lipsyncBSW[0] * 3.0;
    

  }
  // Facial interpolation (high face)
  if (this.FA || this._FacialLexemes.length != 0){
  	this._blendshapes[this.browsDownBSIndex].weight = this._facialBSW[5] * this.browsDownFactor; // browsDown
  	this._blendshapes[this.browsInnerUpBSIndex].weight = this._facialBSW[6] * this.browsInnerUpFactor; // browsInnerUp
  	this._blendshapes[this.browsUpBSIndex].weight = this._facialBSW[7] * this.browsUpFactor; // browsUp
  	this._blendshapes[this.eyeLidsBSIndex].weight = this._facialBSW[8]; // eyeLids
  }
  */
  // Eye blink
	var keys = Object.keys(this._facialBS);
  var blinkW = this._facialBS[keys[0]][this._eyeLidsBS[0][0]]
  
  if (this._blinking && this._eyeLidsBS.length){
    weight = this._Blink.update(dt, blinkW);
    if (weight !== undefined)
      var i = 0;
      for(var morph in this._morphDeformers)
      {
        for(var j = 0; j< this._eyeLidsBS[i].length; j++){
          
    			this._morphDeformers[morph][this._eyeLidsBS[i][j]].weight = weight;
        }
        i++;
      }
    if (!this._Blink.transition)
      this._blinking = false;
  }
  var i = 0;
  for(var morph in this._morphDeformers)
  {
    for(var j = 0; j< this._squintBS[i].length; j++){

      this._morphDeformers[morph][this._squintBS[i][j]].weight = this._morphDeformers[morph][this._squintBS[i][j]].weight*0.7 + 0.3*this._facialBS[keys[0]][this._squintBS[0][0]];
    }
    i++;
  }
}

// --------------------- FACIAL EXPRESSIONS ---------------------
// BML
// <face or faceShift start attackPeak relax* end* valaro
// <faceLexeme start attackPeak relax* end* lexeme amount
// <faceFacs not implemented>
// lexeme  [OBLIQUE_BROWS, RAISE_BROWS,
//      RAISE_LEFT_BROW, RAISE_RIGHT_BROW,LOWER_BROWS, LOWER_LEFT_BROW,
//      LOWER_RIGHT_BROW, LOWER_MOUTH_CORNERS,
//      LOWER_LEFT_MOUTH_CORNER,
//      LOWER_RIGHT_MOUTH_CORNER,
//      RAISE_MOUTH_CORNERS,
//      RAISE_RIGHT_MOUTH_CORNER,
//      RAISE_LEFT_MOUTH_CORNER, OPEN_MOUTH,
//      OPEN_LIPS, WIDEN_EYES, CLOSE_EYES]
//
// face/faceShift can contain several sons of type faceLexeme without sync attr
// valaro Range [-1, 1]


LS.Globals.face = function (faceData, cmdId){

  faceData.end = faceData.end || faceData.attackPeak*2 || 0.0;

  LS.Globals.facialController.newFA(faceData, false);

    // Server response
  if (cmdId) 
    setTimeout(LS.Globals.ws.send.bind(LS.Globals.ws), faceData.end * 1000, cmdId + ": true");
}

LS.Globals.faceShift = function (faceData, cmdId){

  faceData.end = faceData.end || faceData.attackPeak*2 || 0.0;

  LS.Globals.facialController.newFA(faceData, true);

    // Server response
  if (cmdId) 
    setTimeout(LS.Globals.ws.send.bind(LS.Globals.ws), faceData.end * 1000, cmdId + ": true");
}

// Declare new facial expression
FacialController.prototype.newFA = function(faceData, shift){
  // Use BSW of the agent
 /* this._facialBSW[0] = this._blendshapes[this.sadBSIndex].weight / this.sadFactor; // sad
  this._facialBSW[1] = this._blendshapes[this.smileBSIndex].weight / this.smileFactor; // smile
  this._facialBSW[2] = this._blendshapes[this.lipsClosedBSIndex].weight / this.lipsClosedFactor; // lipsClosed
  this._facialBSW[3] = this._blendshapes[this.kissBSIndex].weight / this.kissFactor; // kiss
  this._facialBSW[5] = this._blendshapes[this.browsDownBSIndex].weight / this.browsDownFactor; // browsDown
  this._facialBSW[6] = this._blendshapes[this.browsInnerUpBSIndex].weight / this.browsInnerUpFactor; // browsInnerUp
  this._facialBSW[7] = this._blendshapes[this.browsUpBSIndex].weight / this.browsUpFactor; // browsUp
  //this._facialBSW[8] = this._blendshapes[this.eyeLidsBSIndex].weight; // eyeLids
*/

  var BS = this._morphDeformers["Body_SSS"] || this._morphDeformers["Body"];

	for(var morph in this._facialBS)
  {
    for(var i = 0; i< this._facialBS[morph].length; i++)
   		this._facialBS[morph][i] = this._morphDeformers[morph][i].weight;

   
  }
  if(faceData.emotion)
  {
    var data = Object.assign({}, faceData);
    data.type = "faceLexeme";
    var lexemes = [];
    switch(faceData.emotion)
    {
      case "HAPPINESS":        
        lexemes = ["CHEEK_RAISER", "LIP_CORNER_PULLER"] //AU6+AU12
        break;
      case "SADNESS":
        lexemes = ["INNER_BROW_RAISER", "BROW_LOWERER", "DIMPLER"] //AU1+AU4+AU15     
        break;
      case "SURPRISE":
        lexemes = ["INNER_BROW_RAISER", "OUTER_BROW_RAISER", "UPPER_LID_RAISER", "JAW_DROP"] //AU1+AU2+AU5B+AU26     
        break;
      case "FEAR":
        lexemes = ["INNER_BROW_RAISER", "OUTER_BROW_RAISER", "BROW_LOWERER", "UPPER_LID_RAISER", "LID_TIGHTENER", "LIP_STRECHER", "JAW_DROP"] //AU1+AU2+AU4+AU5+AU7+AU20+AU26
        break;
      case "ANGER":
        lexemes = ["BROW_LOWERER", "UPPER_LID_RAISER", "LID_TIGHTENER", "LIP_TIGHTENER"] //AU4+AU5+AU7+AU23     
        break;
      case "DISGUST":
        lexemes = ["NOSE_WRINKLER", "LIP_CORNER_DEPRESSOR", "CHIN_RAISER"] //AU9+AU15+AU17     
        break;
      case "CONTEMPT":
        lexemes = ["LIP_CORNER_PULLER_RIGHT", "DIMPLER_RIGHT"] //RAU12+RAU14
        break;
      case "NEUTRAL":        
        lexemes = ["CHEEK_RAISER", "LIP_CORNER_PULLER",
        "INNER_BROW_RAISER", "BROW_LOWERER", "DIMPLER",
        "INNER_BROW_RAISER", "OUTER_BROW_RAISER", "UPPER_LID_RAISER", "JAW_DROP", 
        "INNER_BROW_RAISER", "OUTER_BROW_RAISER", "BROW_LOWERER", "UPPER_LID_RAISER", "LID_TIGHTENER", "LIP_STRECHER", "JAW_DROP",
        "BROW_LOWERER", "UPPER_LID_RAISER", "LID_TIGHTENER", "LIP_TIGHTENER",
        "NOSE_WRINKLER", "LIP_CORNER_DEPRESSOR", "CHIN_RAISER",
        "LIP_CORNER_PULLER_RIGHT", "DIMPLER_RIGHT"] //AU6+AU12
        data.amount= 1 - data.amount;
        break;
    }
    for(var i in lexemes)
    {
      data.lexeme = lexemes[i];
      this._FacialLexemes.push(new FacialExpr (data, shift, this._facialBS));
    }
  }
	else if (faceData.valaro)
  	this.FA = new FacialExpr (faceData, shift, this._facialBS);
  else if (faceData.lexeme)
  {
    this._FacialLexemes.push(new FacialExpr (faceData, shift, this._facialBS));
   
  }
  
}

// Update facial expressions
FacialController.prototype.faceUpdate = function(dt){
  
  if (this.FA){
    // Update FA with Val Aro
    this.FA.updateVABSW( this._facialBS , dt);

    // Remove object if transition finished
    if (!this.FA.transition){
      this.FA = null;
    }
  }
  
  // Update facial lexemes
  for (var i = 0; i < this._FacialLexemes.length; i++){
  	if (this._FacialLexemes[i].transition)
    	this._FacialLexemes[i].updateLexemesBSW(this._facialBS, dt);

  }
  
  // Clean facial lexemes
  for (var i = 0; i < this._FacialLexemes.length; i++){
    if (!this._FacialLexemes[i].transition){
       this._FacialLexemes.splice(i, 1);
    }
  }
  
  
  // Check for NaN errors
  for (var i = 0; i<this._facialBS.length; i++){
    if (isNaN(this._facialBS[i])){
      console.error("Updating facial expressions create NaN values! <this.faceUpdate>");
      this._facialBS[i] = 0;
    }
  }
  
}
FacialController.prototype.resetFace = function(){
  for(var part in this._facialBS)
    {
    	for(var i = 0; i<this._facialBS[part].length; i++)
    	{
      	this._facialBS[part][i] = 0;
        this._morphDeformers[part][i].weight = 0;
    	}
    }
}

// --------------------- GAZE ---------------------
// BML
// <gaze or gazeShift start ready* relax* end influence target influence offsetAngle offsetDirection>
// influence [EYES, HEAD, NECK, SHOULDER, WAIST, WHOLE, ...]
// offsetAngle relative to target
// offsetDirection (of offsetAngle) [RIGHT, LEFT, UP, DOWN, UPRIGHT, UPLEFT, DOWNLEFT, DOWNRIGHT]
// target [CAMERA, RIGHT, LEFT, UP, DOWN, UPRIGHT, UPLEFT, DOWNLEFT, DOWNRIGHT]

// "HEAD" position is added onStart
this.gazePositions = { "RIGHT": [70, 100, 400], "LEFT": [-70, 100, 400],
  "UP": [0, 130, 400], "DOWN": [0, 80, 400],
  "UPRIGHT": [70, 130, 400], "UPLEFT": [-70, 130, 400],
  "DOWNRIGHT": [70, 80, 400], "DOWNLEFT": [-70, 80, 400],
  "CAMERA": [0, 100, 400]
};



FacialController.prototype.gaze = function(gazeData, cmdId){

  gazeData.end = gazeData.end || 2.0;

  this.newGaze(gazeData, false);
  
  // Server response
  if (cmdId) 
    setTimeout(LS.Globals.ws.send.bind(LS.Globals.ws), gazeData.end * 1000, cmdId + ": true");
}

FacialController.prototype.gazeShift = function(gazeData, cmdId){

  gazeData.end = gazeData.end || 1.0;

  this.newGaze(gazeData, true);
  
  // Server response
  if (cmdId) 
    setTimeout(LS.Globals.ws.send.bind(LS.Globals.ws), gazeData.end * 1000, cmdId + ": true");
}


FacialController.prototype.newGaze = function(gazeData, shift, gazePositions, headOnly){

  // TODO: recicle gaze in gazeManager
  var keys = Object.keys(this._facialBS);
  var eyelidsW = this._facialBS[keys[0]][this._eyeLidsBS[0][0]]
  var squintW = this._facialBS[keys[0]][this._squintBS[0][0]]
  gazeData.eyelidsWeight = eyelidsW; 
  gazeData.squintWeight = squintW; 
  this.gazeManager.newGaze(gazeData, shift, gazePositions, headOnly);
 	
 /* var keys = Object.keys(this._facialBS);
  if(gazeData.offsetDirection.includes("DOWN"))
  
    this._facialBS[keys[0]][this._eyeLidsBS[0][0]] = 0.2;
  else
    this._facialBS[keys[0]][this._eyeLidsBS[0][0]] = 0;
  */
}

// --------------------- HEAD ---------------------
// BML
// <head start ready strokeStart stroke strokeEnd relax end lexeme repetition amount>
// lexeme [NOD, SHAKE]
// repetition cancels stroke attr
// amount how intense is the head nod? 0 to 1
FacialController.prototype.head = function(headData, cmdId)
{

	headData.end = headData.end || 2.0;

  this.newHeadBML(headData);

  // Server response
  if (cmdId) 
    setTimeout(LS.Globals.ws.send.bind(LS.Globals.ws), headData.end * 1000, cmdId + ": true");
}

// New head behavior
FacialController.prototype.newHeadBML = function(headData){
  
  var lookAt = LS.GlobalScene.getNodeByUId(this.headNode);//this._lookAtHeadComponent;
  if (lookAt){
    this.headBML = new HeadBML(headData, LS.GlobalScene.getNodeByUId(this.headNode), lookAt.transform.rotation, lookAt.transform.rotation) 
                               /*lookAt.limit_vertical[0], lookAt.limit_horizontal[0]);*/
  }
}
// Update
FacialController.prototype.headBMLUpdate = function(dt){
  
  if (this.headBML){
   /* if (this.headBML.transition){
      this._lookAtHeadComponent.applyRotation = false;*/
      this.headBML.update(dt);
   /* } else
      this._lookAtHeadComponent.applyRotation = true;*/
  }
}

// BML
// <headDirectionShift start end target>
// Uses gazeBML
FacialController.prototype.headDirectionShift = function(headData, cmdId){
  headData.end = headData.end || 2.0;
  
  headData.influence = "HEAD";
  this.newGaze(headData, true, null, true);
  
  // Server response
  if (cmdId) 
    setTimeout(LS.Globals.ws.send.bind(LS.Globals.ws), headData.end * 1000, cmdId + ": true");
}

LS.registerComponent( FacialController );
