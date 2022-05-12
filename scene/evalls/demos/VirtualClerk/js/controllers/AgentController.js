//@ECA controller
// Globals
if (!LS.Globals)
  LS.Globals = {};

LS.Globals.WAITING=0;
LS.Globals.PROCESSING=1;
LS.Globals.SPEAKING=2;
LS.Globals.LISTENING=3;

window.SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
this.onStart = function()
{
  if (window.BehaviorPlanner !== undefined)
  	LS.Globals.BehaviorPlanner = new BehaviorPlanner();
  else
    console.error("Planner not included");
  if (window.BehaviorManager !== undefined)
  	LS.Globals.BehaviorManager = new BehaviorManager();
  else
    console.error("Manager not included");

  LS.Globals.facialController = LS.GlobalScene.findNodeComponents("FacialController")[0]
  if(!LS.Globals.facialController )
    console.error("FacialController component not found")
    
  LS.Globals.speechController = LS.GlobalScene.findNodeComponents("SpeechManager")[0];
  if(!LS.Globals.speechController )
    console.error("SpeechController component not found")
   
   var poser = LS.GlobalScene.findNodeComponents("Poser")[0];
   if(!poser )
    console.error("Poser component not found") 
   else
   	LS.Globals.gestureManager = new GestureManager(poser) 
  
  var playAnimation = LS.GlobalScene.findNodeComponents("PlayAnimation")[0];
  if(!playAnimation )
    console.error("PlayAnimation component not found") 
   else
    LS.Globals.animationManager = new AnimationManager(playAnimation) ;

  LS.Globals.speechRecogniser = new window.SpeechRecognition();
  LS.Globals.speechRecogniser.lang = 'en-US';
  LS.Globals.speechRecogniser.onresult =  this.onResult;

  //LS.Globals.ws = {};
  
  // Resources
  // Pre-load audio files. Contains blocks with lg content
  LS.Globals.lipsyncModule = new Lipsync();
  LS.Globals.speechController._lipsync = LS.Globals.lipsyncModule;
  LS.Globals.pendingResources = [];
}

this.onResult = function(event)
{
  
   for (var i = event.resultIndex; i < event.results.length; ++i) {

      if (event.results[i].isFinal) {
      	LS.Globals.speechRecogniser.stop();
      	if(LS.Globals.ws)
          LS.Globals.ws.send(JSON.stringify({type:"data", data: {user: {text: event.results[i][0].transcript}}}))
   		console.log(event.results[i][0].transcript)
      }
   }
}

this.onUpdate = function(dt)
{
	var newBlock = null;
 
  if (LS.Globals.BehaviorPlanner)
    newBlock = LS.Globals.BehaviorPlanner.update(dt);

  if (LS.Globals.BehaviorManager)
    LS.Globals.BehaviorManager.update(LS.Globals.processBML, LS.GlobalScene.time);
		
  if(LS.Globals.gestureManager)
    LS.Globals.gestureManager.update(dt)
      
  if(LS.Globals.animationManager)
    LS.Globals.animationManager.update(dt)
  
  if (newBlock !== null && newBlock !== undefined) 
  {
    LS.Globals.BehaviorManager.newBlock(newBlock, LS.GlobalScene.time);  
  }
    
  if(LS.Globals.lipsyncModule){
    
    LS.Globals.lipsyncModule.update();
    LS.Globals.speaking = LS.Globals.lipsyncModule.working;
  }
}


// Process message
// Messages can come from inner processes. "fromWS" indicates if a reply to the server is required in BMLManager.js
LS.Globals.processMsg = function(data, fromWS) {

  // Process block
  // Create new bml if necessary
  /*if (LS.Globals.BehaviorPlanner)
  {

    //LS.Globals.BehaviorPlanner.newBlock(msg);
    if(msg.speech)
      LS.Globals.BehaviorPlanner.transition({control:LS.Globals.SPEAKING})
      //LS.Globals.processMsg(JSON.stringify({control:LS.Globals.SPEAKING}));
      }
  if (!msg) {
    console.error("An undefined block has been created by BMLPlanner.", msg);
    return;
  }*/

  // Update to remove aborted blocks
  if (!LS.Globals.BehaviorManager)
    return;

  LS.Globals.BehaviorManager.update(LS.Globals.processBML, LS.GlobalScene.time);

  

  /*  // Add new block to stack
    if(data.constructor == Array)
    {
      for(var i = 0; i < data.length; i++)
      {
        var msg = data[i];
        if(msg.type == "info")
          continue;

        if(!msg.end &&msg.duration)
          msg.end = msg.start+msg.duration;
        var block = {};
        block[msg.type] = msg;
        LS.Globals.BehaviorManager.newBlock(block);
      }
    }else
    { 
      if(data.type == "info")
        return;
      else
        LS.Globals.BehaviorManager.newBlock(data, LS.GlobalScene.time);
    }*/
    // Add new block to stack
    //LS.Globals.BehaviorManager.newBlock(msg, LS.GlobalScene.time);
  var data  = JSON.parse(data);
  if(data.type == "behaviours") data = data.data;
  // Add new block to stack
  var msg = {};
  if(data.constructor == Array)
  {
    var end =-1000;
    var start = 1000;
    for(var i = 0; i < data.length; i++)
    {
      
      if(data[i].type == "info")
        continue;

      if(!data[i].end &&data[i].duration)
      {
        data[i].end = data[i].start+data[i].duration;
        if(data[i].attackPeak) data[i].attackPeak +=data[i].start;
        if(data[i].ready) data[i].ready +=data[i].start;
        if(data[i].strokeStart) data[i].strokeStart +=data[i].start;
        if(data[i].stroke) data[i].stroke +=data[i].start;
        if(data[i].strokeEnd) data[i].strokeEnd +=data[i].start;
        if(data[i].relax) data[i].relax +=data[i].start;
      }
     // LS.Globals.BehaviorManager.newBlock(data[i]);
   
      if(msg[data[i].type])
      {
        if(msg[data[i].type].constructor == Object)
        {
        	var currentData = Object.assign({},msg[data[i].type]);
          msg[data[i].type] = [currentData];
      	}
        msg[data[i].type].push(data[i]);
      }
      else
      	msg[data[i].type] = data[i];
      //msg = data[i];
     // LS.Globals.BehaviorManager.newBlock(msg);
      if(data[i].end > end) end = data[i].end;
      if(data[i].start < start) start = data[i].start;
      /*if ((data[i].type == "speech" || data[i].type == "lg") && LS.Globals.BehaviorPlanner)
      {
        msg.control=LS.Globals.SPEAKING
        LS.Globals.BehaviorPlanner.transition(msg)
        msg.composition = "MERGE"
      }*/
    }
    
    msg.start = start;
    msg.end = end;
    
    msg.composition = msg.composition || "OVERWRITE"
    LS.Globals.BehaviorManager.newBlock(msg);
  }
  else if(data.constructor == Object)
  {
    msg = data;
    if(data.type == "state" || data.type == "control")
    {
      if(data.parameters)
      {
        msg.control = LS.Globals[data.parameters.state.toUpperCase()];
        LS.Globals.BehaviorPlanner.transition(msg);
        returnM
      }
      
    }/*else if( data.type == "lg" ||data.type == "speech"){
      msg.control = LS.Globals.SPEAKING
      LS.Globals.BehaviorPlanner.transition(msg)
      return;
     
    }*/
    else if(data.type == "info")
        return;
    LS.Globals.BehaviorManager.newBlock(msg);
  }
  
  if (fromWS)
    msg.fromWS = fromWS;

  console.log("Processing message: ", msg);

  // Input msg KRISTINA
  LS.Globals.inputMSG = msg;

  // This is here for the GUI
  if (typeof LS.Globals.msgCallback == "function") {
    //LS.Globals.msgCallback(msg);
    var res = LS.Globals.msgCallback(msg);
    if (res === false) {
      if (fromWS) {
       // LS.Globals.ws.send(msg.id + ": true"); // HARDCODED
        console.log("(shortcut) Sending POST response with id:", msg.id);
      }
      return;
    }
  }

  // Client id -> should be characterId?
  if (msg.clientId !== undefined && !LS.Globals.ws.id) {
    LS.Globals.ws.id = msg.clientId;

    console.log("Client ID: ", msg.clientId);
    LS.infoText = "Client ID: " + msg.clientId;

    return;
  }

  // Load audio files
  if (msg.lg) {
    var hasToLoad = LS.Globals.loadAudio(msg);
    if (hasToLoad) {
      LS.Globals.pendingResources.push(msg);
      console.log("Needs to preload audio files.");
      return;
    }
  }

  if (!msg) {
    console.error("An undefined msg has been received.", msg);
    return;
  }

  // Process block
  // Create new bml if necessary
  if (LS.Globals.BehaviorPlanner)
  {
    
    //LS.Globals.BehaviorPlanner.newBlock(msg);
    if(msg.speech || msg.lg)
      LS.Globals.BehaviorPlanner.transition({control:LS.Globals.SPEAKING})
      //LS.Globals.processMsg(JSON.stringify({control:LS.Globals.SPEAKING}));
      }
  if (!msg) {
    console.error("An undefined block has been created by BMLPlanner.", msg);
    return;
  }

  // Update to remove aborted blocks
  if (!LS.Globals.BehaviorManager)
    return;

  LS.Globals.BehaviorManager.update(LS.Globals.processBML, LS.GlobalScene.time);

  if (!msg) {
    console.error("An undefined block has been created due to the update of BMLManager.", msg);
    return;
  }

  /*  // Add new block to stack
    if(data.constructor == Array)
    {
      for(var i = 0; i < data.length; i++)
      {
        var msg = data[i];
        if(msg.type == "info")
          continue;

        if(!msg.end &&msg.duration)
          msg.end = msg.start+msg.duration;
        var block = {};
        block[msg.type] = msg;
        LS.Globals.BehaviorManager.newBlock(block);
      }
    }else
    { 
      if(data.type == "info")
        return;
      else
        LS.Globals.BehaviorManager.newBlock(data, LS.GlobalScene.time);
    }*/
    // Add new block to stack
    //LS.Globals.BehaviorManager.newBlock(msg, LS.GlobalScene.time);
}

// Process message
LS.Globals.processBML = function(key, bml) {

    if (!LS.Globals.facialController)
        return;

    var thatFacial = LS.Globals.facialController;

    switch (key) {
        case "blink":
            thatFacial._blinking = true;
            thatFacial.newBlink(bml);
            break;
        case "gaze":
            if(bml.shift == undefined)
              bml.shift = false;
            thatFacial.newGaze(bml, bml.shift);
            break;
        case "gazeShift":
            thatFacial.newGaze(bml, true);
            break;
        case "head":
            thatFacial.newHeadBML(bml);
            break;
        case "headDirectionShift":
            thatFacial.headDirectionShift(bml);
            break;
        case "face":
            if(bml.shift == undefined)
            	bml.shift = false;
            thatFacial.newFA(bml, bml.shift);
            break;
        case "faceLexeme":
        		if(bml.shift == undefined)
              bml.shift = false;
            thatFacial.newFA(bml, bml.shift);
            break;
        case "faceFACS":
            thatFacial.newFA(bml, false);
            break;
        case "faceEmotion":
        		if(bml.shift == undefined)
              bml.shift = false;
            thatFacial.newFA(bml, bml.shift);
            break;
        case "faceVA":
          if(bml.shift == undefined)
            bml.shift = false;
          thatFacial.newFA(bml, bml.shift);
          break;
        case "faceShift":
            thatFacial.newFA(bml, true);
            break;
        case "speech":
        	console.log("TTS:" + bml.text)
          //LS.Globals.speechController.start = true;
            LS.Globals.speechController.inputText = bml.text;
        		//thatFacial.newLipSync(bml.text)
            break;
        case "gesture":
            LS.Globals.gestureManager.newGesture(bml)   
        	//LS.Globals.gesture(bml);
            break;
        case "posture":
        		
            //LS.Globals.posture(bml);
            break;
        case "pointing":
            break;
        case "animation":
          LS.Globals.animationManager.newAnimation(bml)
          break;
        case "lg":
          if(bml.audio)
            LS.Globals.lipsyncModule.loadBlob(bml.audio);
          if(bml.url)
            LS.Globals.lipsyncModule.loadSample(bml.url)
          
          //thatFacial.newLipSync()
            //thatFacial._visSeq.sequence = bml.sequence;
           // thatFacial._audio.src = bml.audioURL; // When audio loads it plays
            // All "lg" go through pending resources and are called when the audio is loaded.
            // If I assign again the audioURL is the audio already loaded?
            
           /* var CC = LS.GlobalScene._root.getComponent("CaptionsComponent");
            if (CC && !LS.Globals.hideCaptions){
              	var split = 5.0;
              
                if (bml.duration <= split )
                    CC.addSentence(bml.text, CC.getTime(), CC.getTime() + bml.end);
              
              	else{
                  	bml.text.replace(".", " .").replace(",", " ,").split(" ");
                  
                  	var sentence =  [0,0,""], copy = null;
                		for(var w in bml.words){
                    		var word = bml.words[w];
                      	sentence[1] = word.end;	
                      	sentence[2] += " "+word.word;
                      	
                  			if( (sentence[1] - sentence[0])/split >= 1){
                        		copy = sentence.clone();
                    				CC.addSentence(copy[2], CC.getTime() + copy[0], CC.getTime() + copy[1]);
                   					sentence = [sentence[1],sentence[1],""];
                  			}
												
                		}
              	}

            }
                
						
            if(bml.metadata){
              LS.Globals.lg = {metadata : bml.metadata,
                               start: bml.start,
                               end:bml.end,
                               valence:bml.valence,
                               arousal:bml.arousal};
              LS.Globals.count = bml.end - bml.start;
              if(bml.metadata.FacialExpression){
                LS.Globals.BMLManager.newBlock({"id":"face", "face":{ "start": bml.start, "attackPeak": ((bml.end - bml.start)/4), end: bml.end, "valaro": [bml.valence,bml.arousal]}, composition:"OVERWRITE"})
              }
                
            }*/
            break;
    }
}

// Preloads audios to avoid loading time when added to BML stacks
LS.Globals.loadAudio = function(block){
  var output = false;
  if (block.lg.constructor === Array){
    for (var i = 0; i<block.lg.length; i++){
      if (!block.lg[i].audio){
        block.lg[i].audio = new Audio();
        block.lg[i].audio.src = block.lg[i].url;
        output = true;
      }
    }
  }
  else {
    if (!block.lg.audio){
      block.lg.audio = new Audio();
      block.lg.audio.src = block.lg.url;
      output = true;
    }
  }
  
  return output;    
}

/* ---------------------------------------------- OLD!!!!!! -----------------------------------------------------*/

// Process message
// Messages can come from inner processes. "fromWS" indicates if a reply to the server is required in BMLManager.js
/*LS.Globals.processMsg = function(msg, fromWS) {
	
    msg = JSON.parse(msg);

    if (fromWS)
        msg.fromWS = fromWS;

    console.log("Processing message: ", msg);

    // Input msg 
    LS.Globals.inputMSG = msg;

    // This is here for the GUI
    if (typeof LS.Globals.msgCallback == "function") {
        //LS.Globals.msgCallback(msg);
        var res = LS.Globals.msgCallback(msg);
        if (res === false) {
            if (fromWS) {
                LS.Globals.ws.send(msg.id + ": true"); // HARDCODED
                console.log("(shortcut) Sending POST response with id:", msg.id);
            }
            return;
        }
    }

    var controller = LS.GlobalScene.findNodeComponents("AgentController")[0]
		if(!controller)
    {
      console.error("AgentController component not found")
      return;
    }
    if (!msg) {
        console.error("An undefined msg has been received.", msg);
        return;
    }

  if(msg.speech)
  {
    
    if(!msg.speech.text)
    {
      console.error("Text field not found")
      return;
    }
    controller.text = msg.speech.text;
    controller.startSpeak = true;
    //controller.state = LS.Globals.SPEAKING;
  }
	if(msg.animation)
  {
    if(msg.animation=="" )
      return;
    controller.data.animation = msg.animation;
    
  }
  if(msg.gesture)
  {
    if(!msg.gesture.lexeme)
    {
      console.error("Lexeme field not found")
      return;
    }
    var lexeme = msg.gesture.lexeme
    controller.pose = { lexeme : 1}
  }
  if(msg.control!=undefined)
  {
    
    controller.changeState(msg.control)
  }
  if(msg.facialExpression)
  {
    
    controller._targetVA = {
      target: msg.facialExpression.va,
      current: controller.va,
      apply:true
    }
    if(msg.facialExpression.duration)
      controller._targetVA.duration = msg.facialExpression.duration
  }
	else if(msg.constructor == Array)
  {
    for(var i= 0; i<msg.length; i++)
    {
      var data = msg[i];
      switch(data.type)
      {
        case "speech":
          controller.text = data.text;
    			controller.startSpeak = true;
          break;
      }
    }
  }
}
*/