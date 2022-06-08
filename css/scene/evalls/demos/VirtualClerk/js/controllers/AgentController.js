  //@ECA controller
  // Globals
  if (!LS.Globals)
    LS.Globals = {};
  
  LS.Globals.WAITING=0;
  LS.Globals.PROCESSING=1;
  LS.Globals.SPEAKING=2;
  LS.Globals.LISTENING=3;
  LS.Globals.endSpeakingTime = -1;
  
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
      /*if( LS.Globals.lipsyncModule.working ) {
        LS.Globals.speaking = true;
        LS.Globals.notSpeakingTime = 0;
      }
      else{
        LS.Globals.notSpeakingTime+=1;
      }
      if(LS.Globals.notSpeakingTime>400)
        LS.Globals.speaking = false;*/
      //LS.Globals.speaking = LS.Globals.lipsyncModule.working;
    }
    if(LS.Globals.BehaviorManager.lgStack.length && LS.Globals.BehaviorManager.time <= LS.Globals.BehaviorManager.lgStack[LS.Globals.BehaviorManager.lgStack.length -1].endGlobalTime){
      LS.Globals.endSpeakingTime = LS.Globals.BehaviorManager.lgStack[LS.Globals.BehaviorManager.lgStack.length -1].endGlobalTime + 1
      LS.Globals.speaking = true;
    }
    else if(LS.Globals.endSpeakingTime > -1 && LS.Globals.BehaviorManager.time <= LS.Globals.endSpeakingTime || LS.Globals.lipsyncModule.working){
      LS.Globals.speaking = true;
    }
    else{
      LS.Globals.endSpeakingTime = -1;
      LS.Globals.speaking = false;
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
        if ((data[i].type == "speech" || data[i].type == "lg") && LS.Globals.BehaviorPlanner)
        {
          msg.control=LS.Globals.SPEAKING
         /* LS.Globals.BehaviorPlanner.transition(msg)
          msg.composition = "MERGE"*/
        }
        msg.composition = data[i].composition || "MERGE"
      }
      
      msg.start = start;
      msg.end = end;
      
      
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
          /*LS.Globals.BehaviorPlanner.transition(msg);
          return;*/
        }
        else{
          
          LS.Globals.BehaviorPlanner.transition(msg);
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
      LS.Globals.notSpeakingTime = 0;
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
              thatFacial.newTextToLip(bml.textToLipInfo)
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
  this.onRenderGUI = function(gl){


    var width  = gl.viewport_data[2];
    var height = gl.viewport_data[3];
    gl.start2D();

    if (!gl.mouse.left_button){
      this._clicked = false;
    }
    
    
    //TOGGLE Debugger
    var area=[width-150,40,125,25];
    this.showDebugger = LS.GUI.Toggle( area, this.showDebugger, "Debugger")
    
    var area=[width-150,80,125,20];
    
   /* LS.GUI.pushStyle();
    
    var micTexture = LS.ResourcesManager.getTexture("evalls/projects/data/imgs/microphone.png", {temp_color:[40,120,40,255]});
    var micTextureOver = LS.ResourcesManager.getTexture("evalls/projects/data/imgs/microphone_over.png", {temp_color:[40,120,40,255]});
    var start_speak = LS.GUI.Button([width-120,120,50,40], micTexture, micTextureOver);
    
    if(start_speak)
      LS.Globals.speechRecogniser.start();
    
    if(LS.Globals.speechController)
    {
      var isSpeaking = LS.Globals.speechController.isSpeaking();
      if(isSpeaking){
        LS.GUI.backgroundColor = "rgba(0,255,0,1)";
        console.log("SPEAKING")
      }
    }
    var speaking = LS.GUI.Button(area, "Stop speaking");
    LS.GUI.popStyle()
    if(speaking)
      LS.Globals.speechController.stop();
    */
    
    
   
      var resetFace = LS.GUI.Button([width-150,80,125,25], "Reset face");
      if(resetFace) LS.Globals.facialController.resetFace();
  
      var planner = LS.GUI.Button([width-150,120,125,25], "Test planner");
      if(planner) window.open("https://webglstudio.org/projects/present/demos/BML-realizer/agent-controller/test/");
      //gl.start2D();
   
      
      // ---------------- BML REALIZER----------------------------------
      // Blocks
      var blockStack = null;
      var bmlStacks = null;
      if (LS.Globals)
        if (LS.Globals.BehaviorManager){
          blockStack = LS.Globals.BehaviorManager.stack;
          bmlStacks = LS.Globals.BehaviorManager.BMLStacks;
        }
      
      
      // Viewport
      var w = gl.viewport_data[2];
      var h = gl.viewport_data[3];
      
      // Base rectangle
      var psize = 0.3;
      var r={x:0,y:h*(1-psize),w:w,h:h*psize};
      gl.fillStyle = "rgba(255,255,255,0.5)";
      gl.fillRect(r.x,r.y,r.w,r.h);
      
      // Row lines
      var maxTextWidth = 0;
      var numRows = stacks.length +1;
      gl.font= 14 * Math.max(h/600, 0.5) + "px Arial"; // Compensated
      for (var i = 0; i < numRows; i++){
        // Lines
        gl.strokeStyle = "rgba(0,0,0,0.3)";
        var height = i/numRows * (h - r.y) + r.y;
        gl.beginPath(); gl.moveTo(0, height); gl.lineTo(w, height); gl.stroke();
        height = (i+1.8)/numRows * (h - r.y) + r.y;
        gl.fillStyle = "rgba(0,0,0,0.5)";
        gl.fillText(stacks[i], 10, height);
        // Adaptive line
        var text = toString(stacks[i]);
        maxTextWidth = Math.max(gl.measureText(text).width, maxTextWidth);
      }
      
      // BMLPLANNER STATE
      if (LS.Globals.BehaviorPlanner){
        gl.font= 10 * Math.max(h/600, 0.5) + "px Arial";
        gl.fillStyle = "rgba(0,0,0,0.5)";
        height = (-1+1.8)/numRows * (h - r.y) + r.y;
        gl.fillText(LS.Globals.BehaviorPlanner.state, 40, height);
      }
      
      // Whissel Wheel
      var wwX = width - 160; var wwY = 160; var wwR = 150;
  
      // Display existing positions in pit
      
      
    
     
      // Column line
      var firstColW = maxTextWidth * 0.5;
      gl.beginPath(); gl.moveTo(firstColW, r.y); gl.lineTo(firstColW, h); gl.stroke();
    
      // Blocks
      if (!blockStack)
        return;
      if (blockStack.length == 0)
        return;
      // Get global timestamp
      var time = LS.GlobalScene.time;
  
      // Block rectangle
      var rr = {x: 0, y:0, w: 0, h: 0};
      for (var i = 0; i<blockStack.length; i++){
        var block = blockStack[i];
        var xB = firstColW + timescale * 10 * (block.startGlobalTime - time);
        var wB = timescale * 10 * Math.min((block.endGlobalTime - time), block.end);
        rr.x = Math.max(firstColW,xB);
        rr.y = r.y;
        rr.w = wB;
        rr.h = r.h;
        gl.strokeStyle = "rgba(0,0,0,0.6)";
        gl.lineWidth = 4;
        gl.strokeRect(rr.x,rr.y, rr.w, rr.h);
        // Add block id on top
        gl.font= 12 * Math.max(h/600, 0.5) + "px Arial"; // Compensated
        gl.fillStyle = "rgba(0,0,0,0.5)";
        gl.fillText(block.id, rr.x, 0.8/numRows * (h - r.y) + r.y);
      }
      // BML instruction rectangles
      for (var i = 0; i < stacks.length; i++){ // bmlStacks.length
        var bmlStack = bmlStacks[i];
        // Select color
        gl.fillStyle = "rgba" + colors[i] + "0.3)";
        for (var j = 0; j < bmlStack.length; j++){
          var bmlIns = bmlStack[j];
          if (bmlIns === undefined){
            console.log("Error in: ", stacks[i], bmlStack);
            return;
          }
          
          // Paint rectangle
          xB = firstColW + timescale * 10 * (bmlIns.startGlobalTime - time);
          wB = timescale * 10 * Math.min((bmlIns.endGlobalTime - time), bmlIns.end);
          rr.x = Math.max(firstColW,xB);
          rr.y = (i+1)/numRows * (h - r.y) + r.y;
          rr.w = Math.max(wB,0);
          rr.h = 1/numRows * (h - r.y);
          gl.fillRect(rr.x, rr.y, rr.w, rr.h);
          gl.lineWidth = 2;
          gl.strokeRect(rr.x, rr.y, rr.w, rr.h);
          
        }
        
      }
      gl.finish2D();
       
    
  }
  
  this._clicked = false;
  //this.gaze.influence = "NECK";
  //this.gaze.offsetAngle = 0.0;
  //this.gaze.offsetDirection = "RIGHT";
  
  this._targetValAro = [0,0];
  this._lipSyncMsg = {"text":"La temperatura óptima para bañar a un bebé es 38 grados.","audioURL":"http://kristina.taln.upf.edu/demo/resources/voice/test_02.wav","duration":3.8106875,"valence":0.5,"arousal":0.5,"sequence":[[0.0,0.0,0.0,0.0,0.0,0.0,0.0],[0.045135416,0.09,0.31,0.0,0.0,0.0,0.18],[0.12075,0.25,0.27,0.0,0.22,0.57,0.15],[0.18573958,0.15,0.45,0.0,0.0,0.0,0.15],[0.24328125,0.12,0.18,0.0,0.0,0.0,0.1],[0.2966146,0.1,0.27,0.0,0.3,0.15,0.1],[0.3519271,0.15,0.25,0.17,0.3,0.0,0.0],[0.3969271,0.12,0.18,0.0,0.0,0.0,0.1],[0.43691665,0.09,0.2,0.0,0.0,0.0,0.18],[0.49691665,0.25,0.27,0.0,0.22,0.57,0.15],[0.5719271,0.15,0.45,0.0,0.0,0.0,0.15],[0.62692714,0.12,0.14,0.0,0.45,0.4,0.06],[0.6670313,0.09,0.2,0.0,0.0,0.0,0.18],[0.7149688,0.25,0.27,0.0,0.22,0.57,0.15],[0.77511466,0.12,0.27,0.0,0.37,0.3,0.12],[0.8421146,0.15,0.25,0.17,0.3,0.0,0.0],[0.89361465,0.15,0.45,0.0,0.0,0.0,0.15],[0.9304271,0.1,0.36,0.0,0.75,0.0,0.15],[0.99284375,0.1,0.27,0.0,0.3,0.15,0.1],[1.0652604,0.25,0.27,0.0,0.22,0.57,0.15],[1.1149375,0.0,0.92,0.0,0.0,0.33,0.0],[1.1479584,0.12,0.18,0.0,0.0,0.0,0.1],[1.191698,0.09,0.31,0.0,0.0,0.0,0.18],[1.2568854,0.25,0.27,0.0,0.22,0.57,0.15],[1.3393333,0.0,0.87,0.0,0.0,0.33,0.0],[1.4121354,0.12,0.14,0.0,0.45,0.45,0.06],[1.4617292,0.25,0.27,0.0,0.22,0.57,0.15],[1.521125,0.15,0.25,0.17,0.3,0.0,0.0],[1.5810626,0.25,0.27,0.0,0.22,0.57,0.15],[1.6209792,0.09,0.2,0.0,0.0,0.0,0.18],[1.6591876,0.25,0.27,0.0,0.22,0.57,0.15],[1.7075833,0.0,0.1,0.17,0.2,0.0,0.1],[1.754,0.25,0.27,0.0,0.22,0.57,0.15],[1.8446875,0.25,0.2,0.0,0.0,0.1,0.05],[1.9488542,0.25,0.27,0.0,0.22,0.57,0.15],[1.9986563,0.09,0.2,0.0,0.0,0.0,0.18],[2.0415416,0.25,0.27,0.0,0.22,0.57,0.15],[2.0951145,0.12,0.14,0.0,0.45,0.4,0.06],[2.1457605,0.2,0.3,0.1,0.0,0.0,0.2],[2.1906877,0.0,0.18,0.17,0.2,0.0,0.0],[2.2361667,0.12,0.18,0.0,0.0,0.0,0.1],[2.2867396,0.0,0.1,0.17,0.2,0.0,0.1],[2.3421144,0.12,0.18,0.0,0.0,0.0,0.1],[2.3923855,0.12,0.18,0.0,0.0,0.0,0.1],[2.4623752,0.15,0.25,0.0,0.15,0.0,0.15],[2.582396,0.15,0.45,0.0,0.0,0.0,0.15],[2.6773958,0.09,0.2,0.0,0.0,0.0,0.18],[2.7173855,0.12,0.18,0.0,0.0,0.0,0.1],[2.7523751,0.1,0.46,0.0,0.75,0.0,0.15],[2.8073854,0.2,0.3,0.1,0.0,0.0,0.2],[2.8623958,0.15,0.45,0.0,0.0,0.0,0.15],[2.9073958,0.25,0.27,0.0,0.22,0.57,0.15],[2.9873958,0.1,0.36,0.0,0.75,0.0,0.15],[3.0623856,0.12,0.27,0.0,0.37,0.3,0.12],[3.1767292,0.1,0.0,0.0,0.0,0.33,0.0],[3.3037813,0.12,0.27,0.0,0.37,0.3,0.12],[3.3565729,0.0,0.87,0.0,0.0,0.33,0.0],[3.4016666,0.09,0.2,0.0,0.0,0.0,0.18],[3.4761562,0.25,0.27,0.0,0.22,0.57,0.15],[3.555646,0.0,0.92,0.0,0.0,0.33,0.0],[3.6256561,0.12,0.27,0.0,0.37,0.3,0.12],[3.738177,0.15,0.25,0.0,0.15,0.0,0.15],[3.8106875,0.0,0.0,0.0,0.0,0.0,0.0]]}
  this._composition = ["MERGE", "REPLACE", "APPEND", "OVERWRITE"];
  this._selComposition = 0;
  
  
  this._state = [LS.Globals.WAITING, "LISTENING", "PLANNING", "SPEAKING"];
  this._selState = 0;
  
  
  
  // Stacks (should concide with BMLManager.BMLStacks order)
  var stacks = ["blink", "gaze", "face", "head", "headDir",
                "speech", "lg"]; //gesture, poiting
  
  // Colors
  var colors = ["(0,255,0,", "(255,132,0,", "(0,0,255,",
                "(255,255,0, 0.5)", "(255,0,0,0.5)", "(0,255,255,",
                "(0,133,0,", "(255,0,255,","(255,63,0,",
                "(255, 255, 127"];
  
  // Time scale
  var timescale = 20;