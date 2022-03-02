//@BehaviorRealizer

// --------------------- BLINK ---------------------
// BML
// <blink start attackPeak relax end amount>
// Scene inputs: eyeLidsBSW and facial expression eyeLidsBSW during updates

function Blink (blinkData, eyeLidsBSW){
  // Sync attributes
  this.start = blinkData.start || 0;
  this.end = blinkData.end || 0.5;
  this.attackPeak = blinkData.attackPeak || (this.end - this.start)*0.4 + this.start;
  this.relax = blinkData.relax || this.attackPeak;
  
  // Initial eyeLidsBSW
  this.initialWeight = eyeLidsBSW || 0;
  this.targetWeight = blinkData.amount || 0.75;
  
  // Transition
  this.transition = true;
  this.time = 0;
}


Blink.prototype.update = function(dt, facialEyeLidsBSW){
  
  this.time += dt;
  
  // Waiting to reach start
  if (this.time < this.start)
    return;
  
  // Transition 1 (closing eyes)
  if (this.time < this.attackPeak){
    inter = (this.time-this.start)/(this.attackPeak-this.start);
    // Cosine interpolation
    inter = Math.cos(Math.PI*inter+Math.PI)*0.5 + 0.5;
    // Return value
    return this.initialWeight*(1-inter) + this.targetWeight * inter;
  }
  
  // Stay still during attackPeak to relax
  if (this.time > this.attackPeak && this.time < this.relax)
    return this.targetWeight;
  
  
  // Transition 2 (opening back)
  if (this.time < this.end){
    inter = (this.time-this.relax)/(this.end-this.relax);
    // Cosine interpolation
    inter = Math.cos(Math.PI*inter)*0.5 + 0.5;
    // Interpolate with scene eyeLidsBSW
    return facialEyeLidsBSW*(1-inter) + this.targetWeight * inter;
  }
  
  // End 
  if (this.time >= this.end){
    this.transition = false;
    return facialEyeLidsBSW;
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
// Scene inputs: sceneBSW

FacialExpr.prototype.sceneBSW;


// Variables for Valence Arousal
FacialExpr.prototype.initialVABSW = [];
FacialExpr.prototype.targetVABSW = [];

// Variables for Lexemes
FacialExpr.prototype.initialLexBSW = [];
FacialExpr.prototype.targetLexBSW = [];

// Psyche Interpolation Table
FacialExpr.prototype._pit = [0.000, 0.000,  0.000,  0.000,  0.000,  0.000,  0.000,  0.000,  0.000,  0.000,  0.000,
                            0.000,  1.000,  0.138,  1.00,  0.000,  0.675,  0.000,  0.056,  0.200,  0.116,  0.100,
                            0.500,  0.866,  0.000,  0.700,  0.000,  0.000,  0.000,  0.530,  0.000,  0.763,  0.000,
                            0.866,  0.500,  0.000,  1.000,  0.000,  0.000,  0.600,  0.346,  0.732,  0.779,  0.000,
                            1.000,  0.000,  0.065,  0.000,  0.344,  0.344,  0.700,  0.000,  0.000,  1.000,  -0.300,
                            0.866,  -0.500, 0.391,  0.570,  0.591,  0.462,  1.000,  0.000,  0.981,  0.077,  0.000,
                            0.500,  -0.866, 0.920,  0.527,  0.000,  0.757,  0.250,  0.989,  0.000,  0.366,  -0.600,
                            0.000,  -1.000, 0.527,  0.000,  0.441,  0.531,  0.000,  0.000,  1.000,  0.000,  0.600,
                            -0.707, -0.707, 1.000,  0.000,  0.000,  0.000,  0.500,  1.000,  0.000,  0.000,  0.600,
                            -1.000, 0.000,  0.995,  0.000,  0.225,  0.000,  0.000,  0.996,  0.000,  0.996,  0.200,
                            -0.707, 0.707,  0.138,  0.075,  0.000,  0.675,  0.300,  0.380,  0.050,  0.216,  0.300];

FacialExpr.prototype._p = vec3.create();
FacialExpr.prototype._pA = vec3.create();


FacialExpr.prototype.lexemes = {LIP_CORNER_DEPRESSOR :0,
                                LIP_CORNER_DEPRESSOR_LEFT: 0,
                                LIP_CORNER_DEPRESSOR_RIGHT: 0,
                                LIP_CORNER_PULLER: 0,
                                LIP_CORNER_PULLER_LEFT: 0,
                                LIP_CORNER_PULLER_RIGHT: 0,
																MOUTH_OPEN: 0,
                                LOWER_LIP_DEPRESSOR: 0,
                                CHIN_RAISER: 0,
                                LIP_PUCKERER: 0,
                                TONGUE_SHOW: 0,
                                LIP_STRECHER: 0,
                                LIP_FUNNELER: 0,
                                LIP_TIGHTENER: 0,
                                LIP_PRESSOR: 0,
                                BROW_LOWERER: 0,
                                BROW_LOWERER_LEFT: 0,
                                LOWER_RIGHT_BROW: 0,
                                LOWER_LEFT_BROW: 0,
                                INNER_BROW_RAISER: 0,
                                OUTER_BROW_RAISER: 0,
                                RAISE_LEFT_BROW: 0,
                                RAISE_RIGHT_BROW:0,
                                UPPER_LID_RAISER: 0,
                                LID_TIGHTENER: 0,
                                EYES_CLOSED: 0,
                                BLINK: 0,
                                WINK: 0,
                                NOSE_WRINKLER: 0,
                                UPPER_LIP_RAISER: 0,
                                DIMPLER: 0,
                                JAW_DROP: 0,
                                MOUTH_STRETCH: 0};


// Blend shapes indices
FacialExpr.prototype.LIP_CORNER_DEPRESSOR = "14&15"; // AU15 sad
FacialExpr.prototype.LIP_CORNER_DEPRESSOR_LEFT = "14"; // LAU15 sad
FacialExpr.prototype.LIP_CORNER_DEPRESSOR_RIGHT = "15"; // RAU15 sad

FacialExpr.prototype.LIP_CORNER_PULLER = "41&42"; // AU12 happy
FacialExpr.prototype.LIP_CORNER_PULLER_LEFT = "41"; // LAU12 happy
FacialExpr.prototype.LIP_CORNER_PULLER_RIGHT = "42"; // RAU12 happy
//FacialExpr.prototype.OPEN_LIPS = 2; // kiss? or small open jaw?
FacialExpr.prototype.PRESS_LIPS = "14&15&32"; // lips pressed
FacialExpr.prototype.MOUTH_OPEN = "35"; // jaw
FacialExpr.prototype.LOWER_LIP_DEPRESSOR = "26&27"; // AU16
FacialExpr.prototype.CHIN_RAISER = "36"; // AU17 mouth up
FacialExpr.prototype.LIP_PUCKERER = "33&34"; // AU18 mouth narrow
FacialExpr.prototype.TONGUE_SHOW = "45"; // AU19
FacialExpr.prototype.LIP_STRECHER = "14&15&32"; // AU20
FacialExpr.prototype.LIP_FUNNELER = "37&38"; // AU22
FacialExpr.prototype.LIP_TIGHTENER = "30&31"; // AU23
FacialExpr.prototype.LIP_PRESSOR = "25&28&46"; // AU24

FacialExpr.prototype.BROW_LOWERER = "2&3&4&5"; // AU4 
FacialExpr.prototype.BROW_LOWERER_LEFT = "2&4"; // 
FacialExpr.prototype.LOWER_RIGHT_BROW = "3"; // brows down
FacialExpr.prototype.LOWER_BROWS = "4&5";

FacialExpr.prototype.INNER_BROW_RAISER = "6&7"; // AU1 rows rotate outwards
FacialExpr.prototype.OUTER_BROW_RAISER = "8&9"; // AU2 brows up (right)
FacialExpr.prototype.RAISE_LEFT_BROW = "8"; // left brow up
FacialExpr.prototype.RAISE_RIGHT_BROW = "9"; // right brow up
FacialExpr.prototype.RAISE_BROWS =  "8&9"; //  brow up

FacialExpr.prototype.UPPER_LID_RAISER = "12&13"; // AU5 negative eyelids closed /wide eyes
FacialExpr.prototype.CHEEK_RAISER = "43&44"; // AU6 squint
FacialExpr.prototype.LID_TIGHTENER = "43&44"; // AU44 squint
FacialExpr.prototype.EYES_CLOSED = "0&1"; // AU43 eyelids closed
FacialExpr.prototype.BLINK = "0&1"; // AU45 eyelids closed
FacialExpr.prototype.WINK = "0"; // AU46   

FacialExpr.prototype.NOSE_WRINKLER = "39&40"; // AU9
FacialExpr.prototype.UPPER_LIP_RAISER = "48&49"; // AU10
FacialExpr.prototype.DIMPLER = "-43&-44&25"; // AU14
FacialExpr.prototype.DIMPLER_LEFT = "-43&25"; // LAU14
FacialExpr.prototype.DIMPLER_RIGHT = "-44&25"; // RAU14
FacialExpr.prototype.JAW_DROP = "22"; // AU26
FacialExpr.prototype.MOUTH_STRETCH = "35"; // AU27

/*FacialExpr.prototype.AUs = {
 
8	Lips toward each other	orbicularis oris

11	Nasolabial deepener	zygomaticus minor

13	Sharp lip puller	levator anguli oris (also known as caninus)


21	Neck tightener	platysma


25	Lips part	depressor labii inferioris, or relaxation of mentalis or orbicularis oris
28	Lip suck
};*/

// Constructor
function FacialExpr (faceData, shift, sceneBSW){
 
  // Scene variables
  if (sceneBSW)
    this.sceneBSW = sceneBSW;

  // Init face valaro
  if (faceData.valaro){
    this.initFaceValAro(faceData, shift);
    return;
  }

  // Init face lexemes 
  if (faceData.lexeme){
    // faceLexeme
    if (typeof(faceData.lexeme) == "string") //(lexeme = "STRING")
      this.initFaceLexeme(faceData, shift, [faceData])
    // One lexeme object inside face/faceShift (faceData.lexeme = {lexeme:"RAISE_BROWS"; amount: 0.1})
    else if (typeof(faceData.lexeme) == "object" && faceData.lexeme.length === undefined)
      this.initFaceLexeme(faceData, shift,  [faceData.lexeme]);
    // Several lexemes inside face/faceShift (faceData.lexeme = [{}, {}]...)
    else if (typeof(faceData.lexeme) == "object" && faceData.lexeme.length !== undefined)
      this.initFaceLexeme(faceData, shift, faceData.lexeme);
       
    return;
  }
  


}




FacialExpr.prototype.initFaceValAro = function(faceData, shift){
  // Sync
  this.start = faceData.start || 0.0;
  this.end = faceData.end;
  
  if (!shift){
    this.attackPeak = faceData.attackPeak || (this.end-this.start)*0.25 + this.start;
    this.relax = faceData.relax || (this.end - this.attackPeak)/2 + this.attackPeak;
  } else {
    this.attackPeak = faceData.attackPeak || this.end;
    this.end = 0.0//faceData.end || faceData.attackPeak || 0.0;
    
    this.relax = 0;
  }

  // Valence and arousal
  this.valaro = faceData.valaro || [0.1, 0.1];
  // Normalize
  var magn = vec2.length(this.valaro);
  if (magn > 1){
    this.valaro[0]/= magn;
    this.valaro[1]/= magn;
  }


  // Initial blend shapes
  if (this.sceneBSW)
    for (var i = 0; i< this.sceneBSW.length; i++)
      this.initialVABSW[i] = this.sceneBSW[i];
  // Target blend shapes
  this.VA2BSW(this.valaro, this.targetVABSW);
  

  
  // Start
  this.transition = true;
  this.time = 0;

}
FacialExpr.BODY_NAME = "Body_SSS";
// There can be several facelexemes working at the same time then? lexemes is an array of lexeme objects
FacialExpr.prototype.initFaceAU = function(faceData, shift, lexemes){
  FacialExpr.BODY_NAME = this.sceneBSW["Body_SSS"] ? "Body_SSS" : "Body";
  // Sync
  this.start = faceData.start || 0.0;
  this.end = faceData.end;
  
  if (!shift){
    this.attackPeak = faceData.attackPeak || (this.end-this.start)*0.25 + this.start;
    this.relax = faceData.relax || (this.end - this.attackPeak)/2 + this.attackPeak;
  } else {
    this.end = faceData.end || faceData.attackPeak || 0.0;
    this.attackPeak = faceData.attackPeak || this.end;
    this.relax = 0;
  }

  // Initial blend shapes and targets
  if (this.sceneBSW){
    // Choose the ones to interpolate
    this.indicesLex = [];
    this.initialLexBSW = [];
    this.targetLexBSW = [];

    var j = 0;
    for (var i = 0; i<lexemes.length; i++){
     

      var index = this[lexemes[i].au]; // "this.RAISE_BROWS = 1" for example
      if(index == undefined)
      {	
        console.err("Lexeme not found")
      	return;
      }
      index = index.split("&");
      // WIDEN_EYES correction
      if (lexemes[i].lexeme == "UPPER_LID_RAISER")
        lexemes[i].amount *= -0.3;
      
      // If lexeme string is not defined or wrong, do not add
      if (index !== undefined){
        // Indices
        this.indicesLex[j] = index;
        this.initialLexBSW[j] = [];
        this.targetLexBSW[j] = [];
        
        for(var idx in index)
        {
          // Initial
          var sign = 1;
          if(idx.includes("-"))
          {
            sign = -1;
            idx = idx.replace("-","");
          }
          this.initialLexBSW[j][idx] = this.sceneBSW[FacialExpr.BODY_NAME][index[idx]];
        	// Target
        	this.targetLexBSW[j][idx] = (lexemes[i].amount !== undefined) ? lexemes[i].amount*sign || faceData.amount*sign : 0;
        }
        

        j++;
      } else
        console.warn("Facial lexeme not found:", lexemes[i].lexeme, ". Please refer to the standard.");
    }
  }


  // Start
  this.transition = true;
  this.time = 0;

}

// There can be several facelexemes working at the same time then? lexemes is an array of lexeme objects
FacialExpr.prototype.initFaceLexeme = function(faceData, shift, lexemes){
  // Sync
  FacialExpr.BODY_NAME = this.sceneBSW["Body_SSS"] ? "Body_SSS" : "Body";
  this.start = faceData.start || 0.0;
  this.end = faceData.end;
  
  if (!shift){
    this.attackPeak = faceData.attackPeak || (this.end-this.start)*0.25 + this.start;
    this.relax = faceData.relax || (this.end - this.attackPeak)/2 + this.attackPeak;
  } else {
    this.end = faceData.end || faceData.attackPeak || 0.0;
    this.attackPeak = faceData.attackPeak || this.end;
    this.relax = 0;
  }

  // Initial blend shapes and targets
  if (this.sceneBSW){
    // Choose the ones to interpolate
    this.indicesLex = [];
    this.initialLexBSW = [];
    this.targetLexBSW = [];

    var j = 0;
    for (var i = 0; i<lexemes.length; i++){
      // To upper case
      lexemes[i].lexeme = stringToUpperCase(lexemes[i].lexeme, "Face lexeme", "NO_LEXEME");

      var index = this[lexemes[i].lexeme]; // "this.RAISE_BROWS = 1" for example
      if(index == undefined)
      	debugger;
      index = index.split("&");
      // WIDEN_EYES correction
      if (lexemes[i].lexeme == "WIDEN_EYES")
        lexemes[i].amount *= -0.3;
      
      // If lexeme string is not defined or wrong, do not add
      if (index !== undefined){
        // Indices
        this.indicesLex[j] = index;
        this.initialLexBSW[j] = [];
        this.targetLexBSW[j] = [];
        
        for(var idx in index)
        {
          // Initial
          this.initialLexBSW[j][idx] = this.sceneBSW[FacialExpr.BODY_NAME][index[idx]];
        	// Target
        	this.targetLexBSW[j][idx] = (lexemes[i].amount !== undefined) ? lexemes[i].amount || faceData.amount : 0;
        }
        

        j++;
      } else
        console.warn("Facial lexeme not found:", lexemes[i].lexeme, ". Please refer to the standard.");
    }
  }


  // Start
  this.transition = true;
  this.time = 0;

}




FacialExpr.prototype.updateVABSW = function(interVABSW, dt){

  // Immediate change
  if (this.attackPeak == 0 && this.end == 0 && this.time == 0){
    for (var i = 0; i < this.sceneBSW.length; i++)
      interVABSW[i] = this.targetVABSW[i];
    // Increase time and exit
    this.time +=dt;
    return;
  }
  // Immediate change (second iteration)
  if (this.attackPeak == 0 && this.end == 0){
    this.transition = false;
    return;
  }

  // Time increase
  this.time += dt;

  // Wait for to reach start time
  if (this.time < this.start)
    return;

  // Stay still during attackPeak to relax
  if (this.time > this.attackPeak && this.time < this.relax)
    return;
  
  
  // Trans 1
  if (this.time < this.attackPeak){
    inter = (this.time-this.start)/(this.attackPeak-this.start);
    // Cosine interpolation
    inter = Math.cos(Math.PI*inter+Math.PI)*0.5 + 0.5;
    //inter = Math.cos(Math.PI*inter+Math.PI)*0.5 + 0.5; // to increase curve, keep adding cosines
    // Interpolation
    for (var i = 0; i < this.sceneBSW.length; i++)
      interVABSW[i] = this.initialVABSW[i]*(1-inter) + this.targetVABSW[i]*inter;
    
  }
  
  // Trans 2
  if (this.time > this.relax && this.relax >= this.attackPeak){
    inter = (this.time-this.relax)/(this.end-this.relax);
    // Cosine interpolation
    inter = Math.cos(Math.PI*inter)*0.5 + 0.5;
    // Interpolation
    for (var i = 0; i < this.sceneBSW.length; i++)
      interVABSW[i] = this.initialVABSW[i]*(1-inter) + this.targetVABSW[i]*inter;
  }
  
  
  // End
  if (this.time > this.end)
    this.transition = false;

  
}




FacialExpr.prototype.updateLexemesBSW = function(interLexBSW, dt){

  // Immediate change
  if (this.attackPeak == 0 && this.end == 0 && this.time == 0){
    for (var i = 0; i < this.indicesLex.length; i++)
      for(var j = 0; j < this.indicesLex[i].length; j++)
        interLexBSW[this.indicesLex[i][j]] = this.targetLexBSW[i][j];
    
    // Increase time and exit
    this.time +=dt;
    return;
  }
  

  // Time increase
  this.time += dt;

  // Wait for to reach start time
  if (this.time < this.start)
    return;

  // Stay still during attackPeak to relax
  if (this.time > this.attackPeak && this.time < this.relax){
    for (var i = 0; i < this.indicesLex.length; i++)
    {
       for(var j = 0; j < this.indicesLex[i].length; j++)
      	interLexBSW[FacialExpr.BODY_NAME][this.indicesLex[i][j]] = this.targetLexBSW[i][j];
    }
    return;
  }
  
  
  // Trans 1
  if (this.time < this.attackPeak){
    inter = (this.time-this.start)/(this.attackPeak-this.start);
    // Cosine interpolation
    inter = Math.cos(Math.PI*inter+Math.PI)*0.5 + 0.5;
    //inter = Math.cos(Math.PI*inter+Math.PI)*0.5 + 0.5; // to increase curve, keep adding cosines
    // Interpolation
    for (var i = 0; i < this.indicesLex.length; i++)
       for(var j = 0; j < this.indicesLex[i].length; j++)
    			interLexBSW[FacialExpr.BODY_NAME][this.indicesLex[i][j]] = this.initialLexBSW[i][j]*(1-inter) + this.targetLexBSW[i][j]*inter;
    
  }

  
  // Trans 2
  if (this.time > this.relax && this.relax >= this.attackPeak){
    inter = (this.time-this.relax)/(this.end-this.relax);
    // Cosine interpolation
    inter = Math.cos(Math.PI*inter)*0.5 + 0.5;
    // Interpolation
    for (var i = 0; i < this.indicesLex.length; i++)
       for(var j = 0; j < this.indicesLex[i].length; j++)
    		interLexBSW[FacialExpr.BODY_NAME][this.indicesLex[i][j]] = this.initialLexBSW[i][j]*(1-inter) + this.targetLexBSW[i][j]*inter;
    
  }
  
  
  // End
  if (this.time > this.end)
  {
    this.transition = false;
  }
  

}








FacialExpr.prototype.VA2BSW = function(valAro, facialBSW){
  
  maxDist = 0.8;
  
  var blendValues = [0,0,0,0,0,0,0,0,0]; // Memory leak, could use facialBSW and set to 0 with a for loop
  var bNumber = 11;
  
  this._p[0] = valAro[0];
  this._p[1] = valAro[1];
  this._p[2] = 0; // why vec3, if z component is always 0, like pA?

  this._pA[2] = 0;

  for (var count = 0; count < this._pit.length/bNumber; count++){
    this._pA[1] = this._pit[count*bNumber];
    this._pA[0] = this._pit[count*bNumber+1];

    var dist = vec3.dist(this._pA, this._p);
    dist = maxDist - dist;

    // If the emotion (each row is an emotion in pit) is too far away from the act-eval point, discard
    if (dist > 0){
      for (var i = 0; i < bNumber-2; i++){
        blendValues[i] += this._pit[count*bNumber +i+2] * dist;
      }
    }
  }


  // Store blend values
  facialBSW [ 0 ] = blendValues[0]; // sad
  facialBSW [ 1 ] = blendValues[1]; // smile
  facialBSW [ 2 ] = blendValues[2]; // lips closed pressed
  facialBSW [ 3 ] = blendValues[3]; // kiss
  
  facialBSW [4]  = blendValues[4]; // jaw

  facialBSW [5] = blendValues[5]; // eyebrow down
  facialBSW [6] = blendValues[6]; // eyebrow rotate outwards
  facialBSW [7] = blendValues[7]; // eyebrow up
  facialBSW [8] = blendValues[8]; // eyelids closed

}







// --------------------- GAZE (AND HEAD SHIFT DIRECTION) ---------------------
// BML
// <gaze or gazeShift start ready* relax* end influence target offsetAngle offsetDirection>
// influence [EYES, HEAD, NECK, SHOULDER, WAIST, WHOLE, ...]
// offsetAngle relative to target
// offsetDirection (of offsetAngle) [RIGHT, LEFT, UP, DOWN, UPRIGHT, UPLEFT, DOWNLEFT, DOWNRIGHT]
// target [CAMERA, RIGHT, LEFT, UP, DOWN, UPRIGHT, UPLEFT, DOWNLEFT, DOWNRIGHT]
// Scene inputs: gazePositions (head and camera), lookAt objects


// Gaze manager (replace BML)
GazeManager.prototype.gazePositions = {
  "RIGHT": [70, 100, 400], "LEFT": [-70, 100, 400],
  "UP": [0, 130, 400], "DOWN": [0, 80, 400],
  "UPRIGHT": [70, 130, 400], "UPLEFT": [-70, 130, 400],
  "DOWNRIGHT": [70, 80, 400], "DOWNLEFT": [-70, 80, 400],
  "CAMERA": [0, 100, 400],
  "EYESTARGET": [0, 100, 400]
};


// Constructor (lookAt objects and gazePositions)
function GazeManager (lookAtNeck, lookAtHead, lookAtEyes, gazePositions){
  // Gaze Actions (could create here inital gazes and then recycle for memory efficiency)
  this.gazeActions = [3];

  // Gaze positions
  this.gazePositions = gazePositions || this.gazePositions;

  // LookAt objects
  this.lookAtNeck = lookAtNeck;
  this.lookAtHead = lookAtHead;
  this.lookAtEyes = lookAtEyes;
}

// gazeData with influence, sync attr, target, offsets...
GazeManager.prototype.newGaze = function(gazeData, shift, gazePositions, headOnly){

  // Gaze positions
  this.gazePositions = gazePositions || this.gazePositions;
  
  // Influence check, to upper case

  gazeData.influence = stringToUpperCase(gazeData.influence, "Gaze influence", "HEAD");

  
  // Overwrite gaze actions
  switch (gazeData.influence){
    case "NECK":
      this.gazeActions[2] = new Gaze(gazeData, shift, this.lookAtNeck, this.gazePositions);
    case "HEAD":
      this.gazeActions[1] = new Gaze(gazeData, shift, this.lookAtHead, this.gazePositions);
    case "EYES":
      if (!headOnly)
      	this.gazeActions[0] = new Gaze(gazeData, shift, this.lookAtEyes, this.gazePositions);
    }
  

}

GazeManager.prototype.update = function(dt){
	
  // Gaze actions update
  for (var i = 0; i<this.gazeActions.length; i++)
  {
    /*var eyelidsW = 0;
  	var squintW = 0;*/
    // If gaze exists (could inizialize empty gazes)
    if (this.gazeActions[i]){
      if (this.gazeActions[i].transition)
      {
        if(i==0 )//&& this.gazeActions[i].offsetDirection.includes("DOWN"))
          var eyes = true
        else
          var eyes = false
        
      	this.gazeActions[i].update(dt, eyes);//update eyelids weight!!!!!!!!!!
        var eyelidsW = this.gazeActions[i].eyelidsW;
        var squintW = this.gazeActions[i].squintW;
      }
    }
	}
  return {eyelids:eyelidsW, squint: squintW};
}







// Memory allocation
Gaze.prototype._tempV = vec3.create();
Gaze.prototype._tempQ = quat.create();
Gaze.prototype.targetP = vec3.create();


// --------------------- GAZE (AND HEAD SHIFT DIRECTION) ---------------------
// Constructor
function Gaze (gazeData, shift, lookAt, gazePositions){

  this.influence = gazeData.influence;
  // Init gazeData
  this.initGazeData(gazeData, shift);

  // Gaze positions
  if (gazePositions)
  	this.gazePositions = gazePositions;

  // Scene variables
  this.cameraEye = gazePositions["CAMERA"] || vec3.create();
  this.headPos = gazePositions["HEAD"] || vec3.create();
  this.lookAt = lookAt;
  
  this.eyelidsFinW = 0;
  //this.lookAtNeck = lookAtNeck;
  //this.lookAtHead = lookAtHead;
  //this.lookAtEyes = lookAtEyes;
  
}




Gaze.prototype.initGazeData = function(gazeData, shift){
  
  this.eyelidsW = gazeData.eyelidsWeight|| 0;
  this.eyelidsInitW = gazeData.eyelidsWeight|| 0;
  this.squintW = gazeData.squintWeight|| 0;
  this.squintInitW = gazeData.squintWeight|| 0;
  // Sync
  this.start = gazeData.start || 0.0;
  this.end = gazeData.end || 2.0;
  if (!shift){
    this.ready = gazeData.ready || this.start + (this.end - this.start)/3;
    this.relax = gazeData.relax || this.start + 2*(this.end - this.start)/3;
  } else {
    this.ready = this.end;
    this.relax = 0;
  }
  
  
  // Offset direction
  this.offsetDirection =stringToUpperCase(gazeData.offsetDirection, "Gaze offsetDirection", "RIGHT");
	
  // Target
 	this.target = stringToUpperCase(gazeData.target, "Gaze target", "CAMERA");
  if (this.target == "FRONT") this.target = "CAMERA";
  
  // Angle
  this.offsetAngle = gazeData.offsetAngle || 0.0;
  
  // Start
  this.transition = true;
  this.time = 0;
  

  // Extension - Dynamic
  this.dynamic = gazeData.dynamic || false;

}





Gaze.prototype.update = function(dt , atEyes){
  
  // Define initial values
  if (this.time == 0)
    this.initGazeValues(atEyes);
  
  // Time increase
  this.time +=dt;
  // Wait for to reach start time
  if (this.time < this.start)
    return;
  // Stay still during ready to relax
  if (this.time > this.ready && this.time < this.relax)
    return;
  
  // Extension - Dynamic (offsets do not work here)
  if (this.dynamic){
    vec3.copy(this.EndP, this.gazePositions[this.target]);
    //console.log(this.gazePositions[this.target]);
  }
  
  //console.log(this.influence, this.neckInP, this.neckEndP, this.headInP, this.headEndP, this.eyesInP, this.eyesEndP);
  
  // Trans 1
  if (this.time < this.ready){
    inter = (this.time-this.start)/(this.ready-this.start);

    
    // Cosine interpolation
    inter = Math.cos(Math.PI*inter+Math.PI)*0.5 + 0.5;
    
    if(atEyes)
    {
      this.eyelidsW =this.eyelidsInitW*inter+this.eyelidsFinW*(1-inter); 
      this.squintW =this.squintInitW*(inter)+this.squintFinW*(1-inter); 
    }
   // inter = Math.cos(Math.PI*inter+Math.PI)*0.5 + 0.5; // to increase curve, keep adding cosines
    // lookAt pos change
    vec3.lerp( this.lookAt.transform.position , this.InP, this.EndP, inter);

    this.lookAt.transform.mustUpdate = true;
  }
  
  // Trans 2
  if (this.time > this.relax && this.relax >= this.ready){
    inter = 1 - (this.time-this.relax)/(this.end-this.relax);

    // Cosine interpolation
    inter = Math.cos(Math.PI*inter + Math.PI)*0.5 + 0.5;
    if(atEyes)
    {
     
    	this.eyelidsW =this.eyelidsInitW*(1-inter)+this.eyelidsFinW*(inter); 
      this.squintW =this.squintInitW*(1-inter)+this.squintFinW*(inter); 
    }
    // lookAt pos change
    vec3.lerp( this.lookAt.transform.position , this.InP, this.EndP, inter);
    this.lookAt.transform.mustUpdate = true;

  }
 
    //console.log(this.eyelidsW)

  // End
  if (this.time > this.end){
  /* if(atHead)
    {
     
    	this.eyelidsW =this.eyelidsInitW*(this.time)+this.eyelidsFinW*(1-this.time); 
      this.squintW =this.squintInitW*(this.time)+this.squintFinW*(1-this.time); 
    }*/
    if(!this.dynamic)
    	this.transition = false;
    // Extension - Dynamic
    else{
    	vec3.copy(this.lookAt.transform.position, this.EndP); 
    }
  }
    
  
  
  
  
}


Gaze.prototype.initGazeValues = function(isEyes){
  
  
  // Find target position (copy? for following object? if following object and offsetangle, need to recalculate all the time!)
  if (this.gazePositions)
    if (this.gazePositions[this.target]){
      var pos = this.gazePositions[this.target];
      if(this.influence == "HEAD" && this.target == "CAMERA")
        pos[0] -= pos[0] 
  		vec3.copy(this.targetP, this.gazePositions[this.target]);
    }else
      vec3.set(this.targetP, 0, 110, 400);
  else
    vec3.set(this.targetP, 0, 110, 400);
  
  
  // Angle offset
  // Define offset angles (respective to head position?)
  // Move to origin
  v = this._tempV;
  q = this._tempQ;
  vec3.subtract(v, this.targetP, this.headPos);
  magn = vec3.length(v);
  vec3.normalize(v,v);
  
  // Rotate vector and reposition
  switch (this.offsetDirection){
    case "UPRIGHT":
      quat.setAxisAngle(q, v, -25*DEG2RAD);//quat.setAxisAngle(q, v, -45*DEG2RAD);
      vec3.rotateY(v,v, this.offsetAngle*DEG2RAD);
      vec3.transformQuat(v,v,q);
      if(isEyes)
      {
        this.eyelidsFinW =0
      	this.squintFinW = 0.5
      }
      break;
    case "UPLEFT":
      quat.setAxisAngle(q, v, -75*DEG2RAD);//quat.setAxisAngle(q, v, -135*DEG2RAD);
      vec3.rotateY(v,v, this.offsetAngle*DEG2RAD);
      vec3.transformQuat(v,v,q);
      if(isEyes)
      {
        this.eyelidsFinW = 0
        this.squintFinW = 0.5
      }
      break;
    case "DOWNRIGHT":
      quat.setAxisAngle(q, v, 25*DEG2RAD);//quat.setAxisAngle(q, v, 45*DEG2RAD);
      vec3.rotateY(v,v, this.offsetAngle*DEG2RAD);
      vec3.transformQuat(v,v,q);
      if(isEyes)
      {
        this.eyelidsFinW = 0.1
        this.squintFinW = 0
      }
      
      break;
    case "DOWNLEFT":
      quat.setAxisAngle(q, v, 75*DEG2RAD);//quat.setAxisAngle(q, v, 135*DEG2RAD);
      vec3.rotateY(v,v, this.offsetAngle*DEG2RAD);
      vec3.transformQuat(v,v,q);
      if(isEyes)
      {
        this.eyelidsFinW = 0.1
        this.squintFinW = 0
      }
      break; 
    case "RIGHT":
      vec3.rotateY(v,v,this.offsetAngle*DEG2RAD);
      if(isEyes)
      {
        this.eyelidsFinW = 0
        this.squintFinW = 0
      }
      break;
    case "LEFT":
      vec3.rotateY(v,v,-this.offsetAngle*DEG2RAD);
      if(isEyes)
      {
        this.eyelidsFinW = 0
        this.squintFinW = 0
      }
      break;
    case "UP":
      quat.setAxisAngle(q, v, -45*DEG2RAD);//quat.setAxisAngle(q, v, -90*DEG2RAD);
      vec3.rotateY(v,v, this.offsetAngle*DEG2RAD);
      vec3.transformQuat(v,v,q);
      if(isEyes)
      {
        this.eyelidsFinW = 0
        this.squintFinW = 0.5
      }
      break;
    case "DOWN":
      quat.setAxisAngle(q, v, 45*DEG2RAD);//quat.setAxisAngle(q, v, 90*DEG2RAD);
      vec3.rotateY(v,v, this.offsetAngle*DEG2RAD);
      vec3.transformQuat(v,v,q);
      if(isEyes)
      {
        this.eyelidsFinW = 0.1
        this.squintFinW = 0
      }
      break;
  }
  // Move to head position and save modified target position
  
  vec3.scale(v,v,magn);
  vec3.add(v,v,this.headPos);
  vec3.copy(this.targetP,v);
  
  if (!this.lookAt || !this.lookAt.transform)
    return console.log("ERROR: lookAt not defined ", this.lookAt);
  
  // Define initial and end positions
  this.InP = vec3.copy(vec3.create(), this.lookAt.transform.position);
  this.EndP = vec3.copy(vec3.create(), this.targetP); // why copy? targetP shared with several?
  
}

// --------------------- HEAD ---------------------
// BML
// <head start ready strokeStart stroke strokeEnd relax end lexeme repetition amount>
// lexeme [NOD, SHAKE, TILT]
// repetition cancels stroke attr
// amount how intense is the head nod? 0 to 1

// head nods will go slightly up -> position = ready&stroke_start and  stroke_end&relax
// Should work together with gaze. Check how far is from the top-bottom angle limits or right-left angle limits
// Scene inputs: head bone node, neutral rotation and lookAtComponent rotation
// Combination of gaze and lookAtComponent:
//if (this.headBML.transition){
//  this._lookAtHeadComponent.applyRotation = false;
//  this.headBML.update(dt);
//} else
//  this._lookAtHeadComponent.applyRotation = true;


// Constructor
// headNode is to combine gaze rotations and head behavior
function HeadBML(headData, headNode, neutralRotation, lookAtRot, limVert, limHor){

  
  // Rotation limits (from lookAt component for example)
  this.limVert = Math.abs(limVert) || 20;
  this.limHor = Math.abs(limHor) || 30;
  
	// Init variables
	this.initHeadData(headData);

	// Scene variables
	this.headNode = headNode;
	this.neutralRotation = neutralRotation;
  this.lookAtRot = lookAtRot;
  
}


// Init variables
HeadBML.prototype.initHeadData = function(headData){
  
  headData.lexeme = stringToUpperCase(headData.lexeme, "Head lexeme", "NOD");
  
  // Lexeme, repetition and amount
	this.lexeme = headData.lexeme || "NOD";
	this.amount = headData.amount || 0.5;

	// Maximum rotation amplitude
  if (this.lexeme == "NOD")
		this.maxDeg = this.limVert * 2;
  else
    this.maxDeg = this.limHor * 2;



	// Sync start ready strokeStart stroke strokeEnd relax end
	this.start = headData.start || 0;
	this.end = headData.end || 2.0;


	this.ready = headData.ready || this.strokeStart || (this.stroke-this.start)/2 || this.end/4;

	this.strokeStart = headData.strokeStart || this.ready;

	// No repetition
	if (!headData.repetition){
		this.stroke = headData.stroke || (this.strokeStart + this.strokeEnd)/2 || this.end/2;
		this.strokeEnd = headData.strokeEnd || headData.relax || (this.stroke + this.end)/2 || this.end*3/4;
		this.relax = headData.relax || this.strokeEnd;
	}
	// Repetition (stroke and strokeEnd will be redefined when updating)
	else {
		this.strokeEnd = headData.strokeEnd || headData.relax || this.end*3/4;
		this.relax = headData.relax || this.strokeEnd;
		// Repetition count
		this.repetition = headData.repetition;
		this.repeatedIndx = 0;
		
		// Modify stroke and strokeEnd
		this.strokeEnd = this.strokeStart + (this.strokeEnd - this.strokeStart)/(1 + this.repetition)
		this.stroke = (this.strokeStart + this.strokeEnd)/2;
	}



	// Start
	this.transition = true;
	this.phase = 0;
	this.time = 0;

}



HeadBML.prototype.update = function (dt){
  this.headNode.transform.mustUpdate = true;
  
  // Define initial values
  if (this.time == 0){
		this.initHeadValues();
    this.headNode.getComponent("Target").enabled = false;
  }
  
	// Time increase
	this.time +=dt;
  var headRotation = this.headNode.transform.rotation;

	// Wait for to reach start time
	if (this.time < this.start)
		return;

	// Ready
	else if (this.time < this.ready){
    inter = (this.time-this.start)/(this.ready-this.start);
    // Cosine interpolation
    inter = Math.cos(Math.PI*inter+Math.PI)*0.5 + 0.5;

    // Should store previous rotation applied, so it is not additive
    if (!this.prevDeg)
      this.prevDeg = 0;
    var angle = inter*this.readyDeg - this.prevDeg;
    this.prevDeg = inter*this.readyDeg;
    // Apply rotation
    if (this.lexeme == "NOD")
    	//this.lookAtRot.transform.position[1]-=angle;
      quat.rotateX(headRotation, headRotation,  -angle*DEG2RAD); // neg is up?
    else if (this.lexeme == "SHAKE")
      //this.lookAtRot.transform.position[0]-=angle;
      //quat.rotateX(headRotation, headRotation,  -
      quat.rotateY(headRotation, headRotation,  -angle*DEG2RAD);
    else if (this.lexeme == "TILT")
      quat.rotateZ(headRotation, headRotation,  -angle*DEG2RAD);
  }

	// StrokeStart
	else if (this.time > this.ready && this.time < this.strokeStart)
		return;
	


	// Stroke (phase 1)
	else if (this.time > this.strokeStart && this.time < this.stroke){
		inter = (this.time-this.strokeStart)/(this.stroke-this.strokeStart);
    // Cosine interpolation
    inter = Math.cos(Math.PI*inter+Math.PI)*0.5 + 0.5;

    // Should store previous rotation applied, so it is not additive
    if (this.phase == 0){
      this.prevDeg = 0;
      this.phase = 1;
    }

    var angle = inter*this.strokeDeg - this.prevDeg;
    this.prevDeg = inter*this.strokeDeg;
    // Apply rotation
    if (this.lexeme == "NOD")
    	//this.lookAtRot.transform.position[1]+=angle;
      quat.rotateX(headRotation, headRotation,  angle*DEG2RAD); // neg is up?
    else if (this.lexeme == "SHAKE")
      //this.lookAtRot.transform.position[0]+=angle;
      quat.rotateY(headRotation, headRotation,  angle*DEG2RAD);
    else if (this.lexeme == "TILT")
      quat.rotateZ(headRotation, headRotation,  angle*DEG2RAD);
	}



	// Stroke (phase 2)
	else if (this.time > this.stroke && this.time < this.strokeEnd){
		inter = (this.time-this.stroke)/(this.strokeEnd-this.stroke);
    // Cosine interpolation
    inter = Math.cos(Math.PI*inter+Math.PI)*0.5 + 0.5;

    // Should store previous rotation applied, so it is not additive
    if (this.phase == 1){
      this.prevDeg = 0;
      this.phase = 2;
    }

    var angle = inter*this.strokeDeg - this.prevDeg;
    this.prevDeg = inter*this.strokeDeg;
    // Apply rotation
    if (this.lexeme == "NOD")
    	//this.lookAtRot.transform.position[1]-=angle;
      quat.rotateX(headRotation, headRotation,  -angle*DEG2RAD); // neg is up?
    else if (this.lexeme == "SHAKE")
      //this.lookAtRot.transform.position[0]-=angle;
      quat.rotateY(headRotation, headRotation,  -angle*DEG2RAD);
    else if (this.lexeme == "TILT")
      quat.rotateZ(headRotation, headRotation,  -angle*DEG2RAD);
	}


	// Repetition -> Redefine strokeStart, stroke and strokeEnd
	else if (this.time > this.strokeEnd && this.repeatedIndx != this.repetition){
		this.repeatedIndx++;
		var timeRep = (this.strokeEnd - this.strokeStart);

		this.strokeStart = this.strokeEnd;
		this.strokeEnd += timeRep;
		this.stroke = (this.strokeEnd + this.strokeStart)/2;

		this.phase = 0;
		return;
	}


	// StrokeEnd (no repetition)
	else if (this.time > this.strokeEnd && this.time < this.relax)
  {
    //this.headNode.getComponent("Target").enabled = true;
		return;
  }
	


	// Relax -> Move towards lookAt final rotation
	else if (this.time > this.relax && this.time < this.end){
		inter = (this.time-this.relax)/(this.end-this.relax);
    // Cosine interpolation
    inter = Math.cos(Math.PI*inter+Math.PI)*0.5 + 0.5;

    quat.slerp(headRotation, headRotation, this.lookAtRot, inter*0.1); // Why 0.1?
    /*
	    // Should store previous rotation applied, so it is not additive
	    if (this.phase == 2){
	    	this.prevDeg = 0;
	    	this.phase = 3;
	    }

	    var angle = inter*this.readyDeg - this.prevDeg;
	    this.prevDeg = inter*this.readyDeg;
	    // Apply rotation
	    quat.rotateX(this.headNode.transform.rotation, this.headNode.transform.rotation,  angle*DEG2RAD); // neg is up?
	*/
  }

  // End
  else if (this.time > this.end)
  {
    //this.headNode.getComponent("Target").enabled = true;
    this.transition = false;
  }
	
  // Progressive lookAt effect
  inter = (this.time-this.start)/(this.end-this.start);
  // Cosine interpolation
  inter = Math.cos(Math.PI*inter+Math.PI)*0.5 + 0.5;
  quat.slerp(headRotation, headRotation, this.lookAtRot, inter*0.1);

  if (this.time > this.end)
  {
    this.headNode.transform.rotation = headRotation
    this.headNode.getComponent("Target").enabled = true;
  }
}


HeadBML.prototype.initHeadValues = function(){
	
	// Head initial rotation
	this.inQ = quat.copy(quat.create(), this.headNode.transform.rotation);

	// Compare rotations to know which side to rotate
	// Amount of rotation
	var neutralInv = quat.invert(quat.create(), this.neutralRotation);
	var rotAmount = quat.mul(quat.create(), neutralInv, this.inQ);
	var eulerRot = quat.toEuler(vec3.create(), rotAmount);
	// X -> right(neg) left(pos)
	// Z -> up(neg) down(pos)

	// in here we choose which side to rotate and how much according to limits
	// the lookAt component should be stopped here (or set to not modify node, only final lookAt quat output)

	// NOD
  if (this.lexeme == "NOD"){
    // nod will always be downwards

    // a final quaternion slerping between initial rotation and final rotation (with lookAt)
		// apply directly to the slerp lookAt. limits will be passed, but it doesn't make sense that the head looks downward when making a nod? Maybe add hard limits? or something similar?
  
    // get ready/strokeStart position
    this.strokeDeg = this.amount * this.maxDeg;
    // Define rot init
    //this.readyDeg = Math.abs(Math.log10(this.amount*10)) * this.maxDeg * 0.2; // 20% of rotation approx
		this.readyDeg = this.strokeDeg * 0.2;
    
    // If the stroke rotation passes the limit, change readyDeg
    if (eulerRot[2]*RAD2DEG + this.strokeDeg > this.limVert)
      this.readyDeg = this.strokeDeg - this.limVert + eulerRot[2]*RAD2DEG;
  }
  // SHAKE
  else if (this.lexeme == "SHAKE"){
    // Define ready/strokeStart position
    this.strokeDeg = this.amount * this.maxDeg;
    //this.readyDeg = Math.abs(Math.log10(this.amount*10)) * this.maxDeg * 0.3;
    this.readyDeg = this.strokeDeg * 0.2;
    
    // Sign (left rigth)
    this.RorL = Math.sign(eulerRot[1]);
    this.readyDeg *= -this.RorL;
    this.strokeDeg *= -this.RorL;
  }
  // TILT?
  else if (this.lexeme == "TILT"){
    this.strokeDeg = this.amount * 20;
    //this.readyDeg = Math.abs(Math.log10(this.amount*10)) * 10 * 0.3;
    this.readyDeg = this.strokeDeg * 0.2;
  }
  
}
// Turn to upper case and error check
var stringToUpperCase = function(item, textItem, def){
 // To upper case
  if (Object.prototype.toString.call(item) === '[object String]')
    return item.toUpperCase();
  else{ // No string
    //console.warn(textItem + " not defined properly.", item);
    return def;
  }
}


//--------------------LIPSYNC------------------

// Constructor (lookAt objects and gazePositions)
function TextToLipsync (text){
  this.weights= {
    open_mouth: 0,
    lips_pressed:0,
    lower_lip_in:0,
    lower_lip_down:0,
    tongue_up:0,
    kiss:0,
    narrow_mouth:0
  }
  this.time = -0.1;
  this.globalTime=0;
  this.BS = [];
  this.idx = 0;
  this.sidx = 0;
  this.text = text || "";
  this.sentences = [];
  this.speaking = false;
  this.numbers = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"]
}
TextToLipsync.prototype.update = function(dt)
{
  var phonemaTiming = 0.03//0.04; //0.05 = microsoft voice
  var sentenceTiming =1//0.015; //0.055 = microsoft voice
   var f = 0.6;
  var weights = Object.assign({}, this.weights)
  
  if(this.sentences[this.sidx ].length && this.idx< this.BS[this.sidx].length)
  {
  	weights = this.BS[this.sidx][this.idx];
    if(this.idx-1>=0)
    {
      for(var w in weights)
      {
        var ww = cosineInterpolate(weights[w], this.BS[this.sidx][this.idx-1][w], f);
        /*var newW = (1-f)*this.BS[this.sidx][this.idx-1][w];
        var ww = smootherstep(newW, 0 , 1) 
        weights[w] *=f +(1-f)*this.BS[this.sidx][this.idx-1][w] ;*/
        weights[w] = ww;
      }
      
    }
    
    if(this.time>=phonemaTiming)//timing of each phonema
    	this.idx++;
  }
 	var time = phonemaTiming*this.sentences[this.sidx ].length+sentenceTiming; //duration of the sentence
 
  /*if(dt>0.2)
    dt= 0.016;*/
  
  if(this.time <=phonemaTiming)//current phonema
  	this.time+=dt;
  else //start next phonema
    this.time = 0;
  
  if (this.time>=0)
	  this.globalTime+=dt;
  
  //start new sentence (reset params)
  if(this.globalTime>= time && this.sidx <this.sentences.length-1)
  {
    this.sidx++;
    this.idx=0;
    this.time =0; //waiting time to start new sentence
    this.globalTime=0;
    if(this.sidx>=this.sentences.length)
    {
      this.time=-1;
      this.speaking = false;
    }
  }
  
	if(this.time>=0.0001)//sentence
  {
    this.speaking = true;
    return weights;
  }
 	
  else //beteween sentences
  {
    this.speaking = false;
    return this.weights;
  }
    
}
String.prototype.splice = function(startIdx, endIdx, len, str) {
    return this.slice(0, startIdx) + str + this.slice( Math.abs(endIdx)+len);
};

function remove(str, char, min, max) {
  
    var text = str.replace(char, function (m0) {
        if (max > min) {
            max--;
            return '';
        }
        return m0;
    });
  return text
}

TextToLipsync.prototype.parse = function(text){
  
  this.BS = [];
  this.idx = 0;
  this.sidx = 0;
  this.globalTime=0;
  this.time=0;
 	this.text = text || this.text;
  //this.text = remove(this.text, /!/g,1, 4);
  this.text = this.text.replace(/[?!.;]/g, " .");
 // this.text = this.text.replace(/[,:]/g, "  ");
  this.text = this.text.replace(/[\/#$%\^&\*{}=\-_`~()']/g,"").toLowerCase(); ///[\/#$%\^&\*{}=\-_`~()]\s'/g
  
  var hasNumbers = /\d/.test(this.text);
  if(hasNumbers){
    var that = this;
  	let i = null, a = this.text.split(""),b = "",num = "";
    a.forEach(function(e)
    {
    	if (!isNaN(e)&&(/\d/.test(e)))
      {
      	
        if(i==null)
          i = a.indexOf(e);
        num += e
               
       // var num2str = that.numbers[e];
				if(a[a.indexOf(e)+1] == " " || num == "55")
        {
          var str = num2words(num);
       		str+=" ";
          
          if(num == "55")
          {
            num+=" ";
           
          }
          that.text = that.text.splice(i, a.indexOf(e), num.length-1, str)
      		a = that.text.split("");
          i = null;
          num ="";
        }
         // num2str+=" ";
        
      	
   		} 
   	})
  }
  
  //split text to sentences
  this.sentences = this.text.split(".");
  if(!this.sentences[this.sentences.length-1].length)
    this.sentences.pop();
  //assign weights to visemes (BS)
  for(var j = 0; j<this.sentences.length; j++)
  {
    var text = this.sentences[j];
    
    var vm = []
    for(var i=0; i<text.length;i++)
    {
      var actions = Object.assign({},this.weights);
      var letter = text[i];
      if(i==0 && letter ==" ")
      {
        var firstPart = text.substr(0, i);
    		var lastPart = text.substr(i + 1);
        text = firstPart+lastPart;
        continue;
      }
      var prevLetter = i==0? "": text[i-1];
      var nextLetter = i==text.length-1? "": text[i+1];
      var nextNextLetter = i==text.length-2? "": text[i+2];
      
      if(letter == "a" || letter == "i" || letter == "y")
      {
        actions.open_mouth = 0.3;
      }
      else if(letter == "e")
      {
        if(!(prevLetter == "n" && nextLetter == " "))
        {
        	actions.open_mouth = 0.25;
        }
        else{console.log("n")}
      }
      else if(letter == "u" || letter == "w")
      {
        
        actions.open_mouth = 0.10;
        actions.narrow_mouth = 0.70;
        actions.tongue_up = 0.20;
        
        /*if(nextNextLetter == " " )//long U
        {
          var firstPart = text.substr(0, i+1);
    			var lastPart = text.substr(i + 2);
          text = firstPart+"u"+lastPart;
          //text[i+1] = "u"
        }*/
          
      }
      else if(letter == "o")
      {
        if(nextLetter == "u" )//&& nextNextLetter == " " )
        { //sounds U
          actions.open_mouth = 0.35;
          //text[i+1] = "";
          var firstPart = text.substr(0, i+1);
    			var lastPart = text.substr(i + 2);
          text = firstPart+lastPart;
        }
        else 
        {
        	actions.open_mouth = 0.35;
        	actions.kiss = 0.20;
        }
          
       /* if(nextLetter == " ")//next sound is U
        {
          text[i+1] = "u";
        }*/
        
      }
      else if(letter =="f" || letter =="v" || letter =="p"&&nextLetter == "h") // /f,v/
      {
        actions.lower_lip_in = 0.85;
        
        if(letter =="p"&&nextLetter == "h" ||letter =="v"&&nextLetter == "e")
        {
        	var firstPart = text.substr(0, i+1);
    			var lastPart = text.substr(i + 2);
          
          text = firstPart+lastPart;
         // text[i+1] = "";
        }
      }
      else if(letter == "l" || letter =="n" || letter =="d" || letter =="r" ||  letter =="t"&&nextLetter!="h") // /t,d,n,l/ 
      {
        actions.open_mouth = 0.3;
        actions.tongue_up = 1;
       	if( letter == "l"&&nextLetter =="d" || letter=="r"&&nextLetter=="")
        {
          var firstPart = text.substr(0, i+1);
    			var lastPart = text.substr(i + 2);
          text = firstPart+lastPart;
          //text[i+1] = "";  
        }
      }
      else if(letter=="t" && nextLetter=="h")
      {
        actions.open_mouth = 0.15;
        actions.tongue_up = 0.5;
        var firstPart = text.substr(0, i+1);
    		var lastPart = text.substr(i + 2);
        text = firstPart+lastPart;
        //text[i+1] = "";  
      }
      else if(letter =="m" || letter =="b" || letter =="p"&&nextLetter != "h") // /p,b,m/
      {
        actions.lips_pressed = 0.15;
        actions.open_mouth = -0.05;
      }
      else if(letter == "s" ||letter == "z" || letter == "c" || letter == "x" || letter=="q")
      {
        if((letter=="c" || letter=="s")&&nextLetter=="h" || letter=="c"&&(nextLetter=="e"||nextLetter=="i")&&nextNextLetter!=" ")
        {
          actions.kiss = 0.5;
          var firstPart = text.substr(0, i+1);
    			var lastPart = text.substr(i + 2);
          text = firstPart+lastPart;
          //text[i+1] = "";  
         
        }
        else
          actions.lower_lip_down = 0.22;
        
        if(nextLetter == "s" || (letter=="c" || letter=="s")&&nextLetter=="e"&&nextNextLetter==" " || letter=="c"&&nextLetter=="k")
        {
          var firstPart = text.substr(0, i+1);
    			var lastPart = text.substr(i + 2);
          text = firstPart+lastPart;
          //text[i+1] = "";  
        }
      }
      else if (letter=="t"&&nextLetter==" ")
      {
        var firstPart = text.substr(0, i+1);
    		var lastPart = text.substr(i + 2);
        text = firstPart+lastPart;
      }
      
     /* else if(letter =="t" || letter =="n" || letter =="d" || letter =="r")
      {
        actions.open_mouth = 0.15;
        actions.tongue_up = 1;
      }*/
      else
      {
        actions.open_mouth = 0.1;
      }
      vm.push(actions)
    /*  if(text[i+1]==" ")
    	{
    	  var firstPart = text.substr(0, i+1);
      	var lastPart = text.substr(i + 2);
      	text = firstPart+lastPart;
    	}*/
    }
    if(vm.length)
    	this.BS.push(vm)
      
    this.sentences[j] = text;   
  }

}

function num2words(num){
  var ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
              'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
              'seventeen', 'eighteen', 'nineteen'];
  var tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty',
              'ninety'];

  var numString = num.toString();

  if (num < 0) throw new Error('Negative numbers are not supported.');

  if (num === 0) return 'zero';

  //the case of 1 - 20
  if (num < 20) {
    return ones[num];
  }

  if (numString.length === 2) {
    return tens[numString[0]] + ' ' + ones[numString[1]];
  }

  //100 and more
  if (numString.length == 3) {
    if (numString[1] === '0' && numString[2] === '0')
      return ones[numString[0]] + ' hundred';
    else
      return ones[numString[0]] + ' hundred and ' + num2words(+(numString[1] + numString[2]));
  }

  if (numString.length === 4) {
    var end = +(numString[1] + numString[2] + numString[3]);
    if (end === 0) return ones[numString[0]] + ' thousand';
    if (end < 100) return ones[numString[0]] + ' thousand and ' + num2words(end);
    return ones[numString[0]] + ' thousand ' + num2words(end);
  }
}
function smootherstep(edge0, edge1, x) {
  if( (edge1 - edge0) == 0 )
    return x;
 // Scale, bias and saturate x to 0..1 range
  x = Math.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0); 
  // Evaluate polynomial
  return x * x * (3 - 2 * x);
}
function cosineInterpolate(y1, y2, mu) {
  const mu2 = (1 - Math.cos(mu * Math.PI)) / 2;
  return (y1 * (1 - mu2)) + (y2 * mu2);
};


function GestureManager(poser)
{
  this.poser = poser;
  
}
GestureManager.prototype.newGesture = function(gestureData)
{
  this.initGestureData(gestureData);
 
}
// Init variables
GestureManager.prototype.initGestureData = function(gestureData){
  
  this.lexeme = gestureData.lexeme.toLowerCase();
  this.gesture= this.poser._poses_by_name[this.lexeme];
  
  // Lexeme, repetition and amount
	this.amount = gestureData.amount || 0.5;

	// Maximum weight
  this.maxW = 1;
  this.minW = 0;
	// Sync start ready strokeStart stroke strokeEnd relax end
	this.start = gestureData.start || 0;
	this.end = gestureData.end || 2.0;


	this.ready = gestureData.ready || this.strokeStart || (this.stroke-this.start)/2 || this.end/4;

	this.strokeStart = gestureData.strokeStart || this.ready;

	// No repetition
	if (!gestureData.repetition){
		this.stroke = gestureData.stroke || (this.strokeStart + this.strokeEnd)/2 || this.end/2;
		this.strokeEnd = gestureData.strokeEnd || gestureData.relax || (this.stroke + this.end)/2 || this.end*3/4;
		this.relax = gestureData.relax || this.strokeEnd;
	}
	// Repetition (stroke and strokeEnd will be redefined when updating)
	else {
		this.strokeEnd = gestureData.strokeEnd || gestureData.relax || this.end*3/4;
		this.relax = gestureData.relax || this.strokeEnd;
		// Repetition count
		this.repetition = gestureData.repetition;
		this.repeatedIndx = 0;
		
		// Modify stroke and strokeEnd
		this.strokeEnd = this.strokeStart + (this.strokeEnd - this.strokeStart)/(1 + this.repetition)
		this.stroke = (this.strokeStart + this.strokeEnd)/2;
	}



	// Start
	this.transition = true;
	this.phase = 0;
	this.time = 0;

}

GestureManager.prototype.update = function (dt){
  
  if(!this.gesture)
    return;
  // Define initial values
/*  if (this.time == 0){
		this.initHeadValues();
  }*/
  this.time+=dt;
  // Wait for to reach start time
	if (this.time < this.start)
  return;

  // Ready
  else if (this.time < this.ready){
    inter = (this.time-this.start)/(this.ready-this.start);
    // Cosine interpolation
    inter = Math.cos(Math.PI*inter+Math.PI)*0.5 + 0.5;

    this.gesture.weight = this.gesture.weight*(1-inter) + this.amount*inter;

  }

  // Stroke (phase 1)
  else if (this.time > this.strokeStart && this.time < this.stroke){
    inter = (this.time-this.strokeStart)/(this.stroke-this.strokeStart);
    // Cosine interpolation
    inter = Math.cos(Math.PI*inter+Math.PI)*0.5 + 0.5;

    // Should store previous rotation applied, so it is not additive
    this.gesture.weight = this.gesture.weight*(1-inter) + this.amount*inter;
  }


  // Stroke (phase 2)
  else if (this.time > this.stroke && this.time < this.strokeEnd){
    inter = (this.time-this.stroke)/(this.strokeEnd-this.stroke);
    // Cosine interpolation
    inter = Math.cos(Math.PI*inter+Math.PI)*0.5 + 0.5;

    this.gesture.weight = this.gesture.weight*(1-inter) - this.amount*inter;
  }


  // Repetition -> Redefine strokeStart, stroke and strokeEnd
  else if (this.time > this.strokeEnd && this.repeatedIndx != this.repetition){
    this.repeatedIndx++;
    var timeRep = (this.strokeEnd - this.strokeStart);

    this.strokeStart = this.strokeEnd;
    this.strokeEnd += timeRep;
    this.stroke = (this.strokeEnd + this.strokeStart)/2;

    this.phase = 0;
    return;
  }

  // StrokeEnd (no repetition)
  else if (this.time > this.strokeEnd && this.time < this.relax)
  {
    //this.headNode.getComponent("Target").enabled = true;
    
    return;
  }

  // Relax -> Move towards lookAt final rotation
  else if (this.time > this.relax && this.time < this.end){
    inter = (this.time-this.relax)/(this.end-this.relax);
    // Cosine interpolation
    inter = Math.cos(Math.PI*inter+Math.PI)*0.5 + 0.5;
    this.gesture.weight = this.gesture.weight*(1-inter) + this.amount*(inter);
  }

  // End
  else if (this.time > this.end)
  {
  // this.headNode.getComponent("Target").enabled = true;
    this.transition = false;
  }

  // Progressive lookAt effect
/*  inter = (this.time-this.start)/(this.end-this.start);
  // Cosine interpolation
  inter = Math.cos(Math.PI*inter+Math.PI)*0.5 + 0.5;
  this.gesture.weight = this.amount*inter;*/

}



// --------------------- LIPSYNC MODULE --------------------

// Switch to https if using this script
/*if (window.location.protocol != "https:")
    window.location.href = "https:" + window.location.href.substring(window.location.protocol.length);
*/

// Globals
if (!LS.Globals)
  LS.Globals = {};

// Audio context
if (!LS.Globals.AContext)
  LS.Globals.AContext = new AudioContext();


// Audio sources


Lipsync.prototype.refFBins = [0, 500, 700,3000, 6000];


// Constructor
function Lipsync(threshold, smoothness, pitch) {

  // Freq analysis bins, energy and lipsync vectors
  this.energy = [0,0,0,0,0,0,0,0];
  this.BSW = [0,0,0]; //kiss,lipsClosed,jaw

  // Lipsync parameters
  this.threshold = threshold || 0.0;
  this.dynamics = 30;
  this.maxDB = -30;
  
  this.smoothness = smoothness || 0.6;
  this.pitch = pitch || 1;
  // Change freq bins according to pitch
  this.fBins = [];
  this.defineFBins(this.pitch);

  // Initialize buffers
  this.init();
  
  // Output .csv (debug)
  //this.outstr = "time, e0, e1, e2, e3, bs_kiss, bs_lips_closed, bs_jaw\n";

  this.working = false;
}





// Start mic input
Lipsync.prototype.start = function(URL){
  // Restart
  this.stopSample();
  
  thatLip = this;
  if (URL === undefined){
   /* navigator.getUserMedia({audio: true}, function(stream) {
      thatLip.stream = stream;
      thatLip.sample = thatLip.context.createMediaStreamSource(stream);
      thatLip.sample.connect(thatLip.analyser);
      console.log("Mic sampling rate:", thatLip.context.sampleRate);
      thatLip.analyser.disconnect();
      thatLip.gainNode.disconnect();
      thatLip.working = true;
    }, function(e){console.error("ERROR: get user media: ", e);});*/
	
  }
  else
    this.loadSample(URL);
  
}
function getBlobURL(arrayBuffer) {
  var i, l, d, array;
        d = arrayBuffer;
        l = d.length;
        array = new Uint8Array(l);
        for (var i = 0; i < l; i++){
            array[i] = d.charCodeAt(i);
        }
        var b = new Blob([array], {type: 'application/octet-stream'});
 // let blob = blobUtil.arrayBufferToBlob(arrayBuffer, "audio/wav")
  return b
}
Lipsync.prototype.loadBlob = function(blob){
  //debugger
  
  const fileReader = new FileReader()

  // Set up file reader on loaded end event
  fileReader.onloadend = () => {

    const arrayBuffer = fileReader.result;
    var that = this;
    this.context.decodeAudioData(arrayBuffer,
      function(buffer){
        //LGAudio.cached_audios[URL] = buffer;
        that.stopSample();
        that.sample = LS.Globals.AContext.createBufferSource();
        that.sample.buffer = buffer;
        console.log("Audio loaded");
        that.playSample();
      }, function(e){ console.log("Failed to load audio");});
  };

  //Load blob
  fileReader.readAsArrayBuffer(getBlobURL(blob))
}

Lipsync.prototype.loadSample = function(inURL, is){
  var URL = inURL.includes("google")? inURL : LS.RM.getFullURL (inURL);
  
  if (LGAudio.cached_audios[URL] && URL.indexOf("blob:") == -1) {
        this.stopSample();
        this.sample = LS.Globals.AContext.createBufferSource();
        this.sample.buffer = LGAudio.cached_audios[URL];
        this.playSample();
  }
  else{
    
    var request = new XMLHttpRequest();
    request.open('GET', URL, true);
    request.responseType = 'arraybuffer';

    var that = this;
    request.onload = function(){
      that.context.decodeAudioData(request.response,
        function(buffer){
          LGAudio.cached_audios[URL] = buffer;
          that.stopSample();
          that.sample = LS.Globals.AContext.createBufferSource();
          that.sample.buffer = buffer;
          console.log("Audio loaded");
          that.playSample();
        }, function(e){ console.log("Failed to load audio");});
    };

    request.send();
  }
}


Lipsync.prototype.playSample = function(){

  // Sample to analyzer
  this.sample.connect (this.analyser);
  // Analyzer to Gain
  this.analyser.connect(this.gainNode);
  // Gain to Hardware
  this.gainNode.connect(this.context.destination);
  // Volume
  this.gainNode.gain.value = 1;
  console.log("Sample rate: ", this.context.sampleRate);
  that = this;
  this.working = true;
  this.sample.onended = function(){that.working = false;};
  // start
  this.sample.start(0);
  //this.sample.loop = true;
  
  // Output stream (debug)
  //this.timeStart = LS.GlobalScene.time;
  //this.outstr = "time, e0, e1, e2, e3, bs_kiss, bs_lips_closed, bs_jaw\n";
}







// Update lipsync weights
Lipsync.prototype.update = function(){
  
  if (!this.working)
    return;

  // FFT data
  if (!this.analyser){
    //if (this.gainNode){
      // Analyser
      this.analyser = this.context.createAnalyser();
      // FFT size
      this.analyser.fftSize = 1024;
      // FFT smoothing
      this.analyser.smoothingTimeConstant = this.smoothness;
      
    //}
    //else return;
  }
  
  // Short-term power spectrum
  this.analyser.getFloatFrequencyData(this.data);

  // Analyze energies
  this.binAnalysis();
  // Calculate lipsync blenshape weights
  this.lipAnalysis();

}



Lipsync.prototype.stop = function(dt){
  // Immediate stop
  if (dt === undefined){
    // Stop mic input
    this.stopSample();

    this.working = false;
  }
  // Delayed stop
  else {
    thatLip = this;
    setTimeout(thatLip.stop.bind(thatLip), dt*1000);
  }
}







// Define fBins
Lipsync.prototype.defineFBins = function(pitch){
  for (var i = 0; i<this.refFBins.length; i++)
      this.fBins[i] = this.refFBins[i] * pitch;
}


// Audio buffers and analysers
Lipsync.prototype.init = function(){

  var context = this.context = LS.Globals.AContext;;
  // Sound source
  this.sample = context.createBufferSource();
  // Gain Node
  this.gainNode = context.createGain();
  // Analyser
  this.analyser = context.createAnalyser();
  // FFT size
  this.analyser.fftSize = 1024;
  // FFT smoothing
  this.analyser.smoothingTimeConstant = this.smoothness;
  
  // FFT buffer
  this.data = new Float32Array(this.analyser.frequencyBinCount);

}


// Analyze energies
Lipsync.prototype.binAnalysis = function(){
  
  // Signal properties
  var nfft = this.analyser.frequencyBinCount;
  var fs = this.context.sampleRate;

  var fBins = this.fBins;
  var energy = this.energy;

  
  // Energy of bins
  for (var binInd = 0; binInd < fBins.length-1; binInd++){
    // Start and end of bin
    var indxIn = Math.round(fBins[binInd]*nfft/(fs/2));
    var indxEnd = Math.round(fBins[binInd+1]*nfft/(fs/2));

    // Sum of freq values
    energy[binInd] = 0;
    for (var i = indxIn; i<indxEnd; i++){
			// Power Spectogram
      //var value = Math.pow(10, this.data[i]/10);
      // Previous approach
      var value = 0.5+(this.data[i]+20)/140;
      if (value < 0) value = 0;
      energy[binInd] += value;
    }
    // Divide by number of sumples
    energy[binInd] /= (indxEnd-indxIn);
    // Logarithmic scale
    //energy[binInd] = 10*Math.log10(energy[binInd] + 1E-6);
    // Dynamic scaling
    //energy[binInd] = ( energy[binInd] - this.maxDB)/this.dynamics + 1 - this.threshold;
  }
}

// Calculate lipsyncBSW
Lipsync.prototype.lipAnalysis = function(){
  
  var energy = this.energy;

  if (energy !== undefined){
    
    
    var value = 0;
    

    // Kiss blend shape
    // When there is energy in the 1 and 2 bin, blend shape is 0
    value = (0.5 - (energy[2]))*2;
    if (energy[1]<0.2)
      value = value*(energy[1]*5)
    value = Math.max(0, Math.min(value, 1)); // Clip
    this.BSW[0] = value;

    // Lips closed blend shape
    value = energy[3]*3;
    value = Math.max(0, Math.min(value, 1)); // Clip
    this.BSW[1] = value;
    
    // Jaw blend shape
    value = energy[1]*0.8 - energy[3]*0.8;
    value = Math.max(0, Math.min(value, 1)); // Clip
    this.BSW[2] = value;
    
    /*
    // Debug
    // outstr
    var timestamp = LS.GlobalScene.time -  this.timeStart;
    this.outstr+= timestamp.toFixed(4) + "," +
      						energy[0].toFixed(4) + "," + 
      						energy[1].toFixed(4) + "," + 
      						energy[2].toFixed(4) + "," +
      						energy[3].toFixed(4) + "," +
      						this.BSW[0].toFixed(4) + "," + 
            			this.BSW[1].toFixed(4) + "," + 
      						this.BSW[2].toFixed(4) + "\n";
*/
  }

}




// Stops mic input
Lipsync.prototype.stopSample = function(){
  // If AudioBufferSourceNode has started
  if(this.sample)
    if(this.sample.buffer)
      this.sample.stop(0);

  
  // If microphone input
  if (this.stream){
    var tracks = this.stream.getTracks();
    for (var i = 0; i<tracks.length; i++)
      if (tracks[i].kind = "audio")
        tracks[i].stop();
    this.stream = null;
	}

}
AnimationManager.prototype.animations = {
  "IDLE": "evalls/projects/animations/animations_idle.wbin",
  "WAVE": "evalls/projects/animations/animations_waving.wbin", 
  "NO": "evalls/projects/animations/animations_no.wbin", 
  "BORED": "evalls/projects/animations/animations_bored.wbin",
  "ANGRY": "evalls/projects/animations/animations_angry.wbin",
  "HAPPY": "evalls/projects/animations/animations_happy.wbin",
  "PRAYING": "evalls/projects/animations/animations_praying.wbin",
  "CRAZY": "evalls/projects/animations/animations_crazy.wbin"
}
/* ANIMATION */
function AnimationManager(component, animations){
  
  this.animManager = component;

  // Animations
  this.animations = animations || this.animations;
  this.playing = false;
}

// animationData with animationID, sync attr, speed
AnimationManager.prototype.newAnimation = function(animationData, animations){
  this.currentAnim = {
    speed: this.animManager.playback_speed,
    animation: this.animManager.animation
    }
  
  this.playing = false;
  // Sync
  this.start = animationData.start || 0.0;
  this.speed = animationData.speed || 1.0;
  this.shift = animationData.shift;
  this.time = 0;
  var url = this.animations[animationData.name];
  this.animationName = url;
  var anim = LS.RM.getResource(this.animationName)
  
  if(!anim)
    LS.RM.load(this.animationName, null, this.setDuration.bind(this))
  else
    this.setDuration(anim)
 

}
AnimationManager.prototype.initValues = function()
{
  
  this.time=0;
}
AnimationManager.prototype.setDuration = function(anim)
{
  this.duration = anim.takes.default.duration;
}
AnimationManager.prototype.update = function (dt){
  
  if(this.time == 0)
    this.initValues();
    // Wait for to reach start time
    
  if (this.time < this.start)
    return;
  else if(this.time>=this.start && !this.playing)
  {
    this.animManager.playback_speed = this.speed;
    this.animManager.animation= this.animationName;
    this.playing = true;
  }
    
  else if(!this.shift && this.time>=this.duration && this.playing)
  {
    this.animManager.animation = this.currentAnim.animation;
    this.animManager.playback_speed = this.currentAnim.speed;
  }

 
  this.time+=dt;
}