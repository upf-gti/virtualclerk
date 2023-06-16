class MindRemote {
  constructor(url) {
    this.connected_to_session = false;
    this.url = url || 'wss:dtic-recepcionist.upf.edu/port/3001/ws/';
  }

  initWebsocket (url = this.url) {
    // if user is running mozilla then use it's built-in WebSocket
    window.WebSocket = window.WebSocket || window.MozWebSocket;
    this.ws = new WebSocket(this.url);
    if(this.ws.readyState == WebSocket.CONNECTING)
    {
      // var container = document.getElementById("err-container");
      // container.innerText ="Connecting...";
    }
    this.ws.onopen = () => {
      // connection is opened and ready to use
      console.log("Connection opened");
      if(this.readyState == WebSocket.OPEN)
        {
            var message = {type: "session", data: {action: "tablet_connection", token: "dev"}};
            this.send(JSON.stringify(message))
          
            //Wait for server response (client connected to this session)!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        }
        else{
          
        }

    };

    this.ws.onerror = (error) => {
      // an error occurred when sending/receiving data

      console.log(error)
    };

    this.ws.onmessage = (message) => {
      // try to decode json (I assume that each message
      // from server is json)
      var json = JSON.parse(message.data);
      try {
        
        //Get current time
        var date = new Date();
        var hours = (date.getHours()>9)? date.getHours(): "0"+date.getHours();
        var minutes = (date.getMinutes()>9)? date.getMinutes(): "0"+date.getMinutes();
        var seconds = (date.getSeconds()>9) ? date.getSeconds(): "0"+date.getSeconds();
        var time = hours+ ":"+ minutes+":"+seconds;

        //Show messages
        switch (json.type) 
        {
          case "request_data":

              if(this.onRequestData)
                this.onRequestData();
              
            break;

          case "request_map":
              // json.type = "request_map"
              // json.data = url donde esta el mapa
              // tablet decides when to hide map
              if(this.onRequestMap)
                this.onRequestMap();
              // var container = document.getElementById("msg-container");
              // container.innerText ="BEHAVIOUR " + time + JSON.stringify(json.behaviours) + "\n\n"
            break;

          case "app_action":

            switch(json.action) {
            
              case "end_conversation":
                if(this.onEndConversation)
                  this.onEndConversation();

                break;
    
              case "abort_conversation":
                if(this.onAbortConversation)
                  this.onAbortConversation();
                break;

              case "mute_toggled":
                  if(this.onMute)
                    this.onMute();
                  break;

              case "recognition_start":
                  if(this.onRecognitionStarts)
                    this.onRecognitionStarts();
                break;
              
              case "recognition_end":
                if(this.onRecognitionEnds)
                    this.onRecognitionEnds();
                
                break;
                
              // just change this if the tablet is not muted
              case "speech_start":
                if(this.onSpeechStarts) 
                  this.onSpeechStarts();
                break;
                  
              case "speech_end":
                if(this.onSpeechEnds) 
                  this.onSpeechEnds();
                break;
            }
            break;
          
          case "return_data":
            if(this.onReturnData)
              this.onReturnData(json);
            break;

          case "info":
            if(json.data.includes("connected to session with token")){
              
              this.connected_to_session = true;
              if(this.onClientConnected)
                this.onClientConnected();
            }

            if(json.data.includes("disconnected from session"))
            {
              this.connected_to_session = false;
              if(this.onClientDisconnected)
                this.onClientDisconnected();
            }
            break;
        }
      }
      catch (e) {
        console.log('This doesn\'t look like a valid JSON: ',  json);
        return;
      }
    };
    return this.ws;
  }


  // send from tablet
  // init
  // person -> after that show "waiting-container" and play-btn with class w3-gray

  // receive
  // end of conversation -> play-btn remove w3-gray, add we-red
  // allow manual input -> hide "waiting-container" && play-btn
  // show map

  /*
  // Insert this in the application
  var end_message = {type:"app_action", action: "end_conversation"}
  var map_message = {type:"app_action", action: "show_map"}
  */

}

export {MindRemote};