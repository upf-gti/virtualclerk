var connected_to_session = false;
var questionnaire_active = false;

function init_websocket () {
  // if user is running mozilla then use it's built-in WebSocket
  window.WebSocket = window.WebSocket || window.MozWebSocket;
  var connection = new WebSocket('wss:dtic-recepcionist.upf.edu/port/3001/ws/');
  if(connection.readyState == WebSocket.CONNECTING)
  {
    // var container = document.getElementById("err-container");
    // container.innerText ="Connecting...";
  }
  connection.onopen = function () {
    // connection is opened and ready to use
    console.log("Connection opened");
    if(this.readyState== WebSocket.OPEN)
      {
          var message = {type: "session", data: {action: "tablet_connection", token: "dev"}};
          this.send(JSON.stringify(message))
         
          //Wait for server response (client connected to this session)!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      }
      else{
         
      }

  };

  connection.onerror = function (error) {
    // an error occurred when sending/receiving data

    console.log(error)
  };

  connection.onmessage = function (message) {
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
            // allow input visibility
            var waiting_cnt = document.getElementById("waiting-container")
            waiting_cnt.style.visibility = "hidden";
            
            showPlayButton(false);
            showSpeechButton(false);

            var cnt = document.getElementById("buttons-container");
            cnt.style.display ='None'; 
            var footer = document.getElementsByTagName("footer")[0];
            footer.style.visibility = "hidden";
            
            showInput(true); 

          break;

        case "request_map":
            // json.type = "request_map"
            // json.data = url donde esta el mapa
            // tablet decides when to hide map
          var container = document.getElementById("msg-container");
          container.innerText ="BEHAVIOUR " + time + JSON.stringify(json.behaviours) + "\n\n"
          break;

        case "app_action":

          switch(json.action) {
          
            case "end_conversation":
              muted = true;
              showQuestionnaire();
              
              showSpeechButton(false);
              showInput(false);
              showPlayButton(true);
              break;
  
            case "abort_conversation":
              showSpeechButton(false);
              showInput(false);
              showPlayButton(true);
              break;

            case "mute_toggled":
                muted = !muted;
                changeSpeechButton(!muted);
                break;

            case "recognition_start":
              console.log('Agent starts recognizing');
              showPlayButton(false);
              
              var skip_btn = document.getElementById("skip-container");
              skip_btn.style.visibility = "hidden";

              showSpeechButton(true);
              changeSpeechButton(true);
              break;
            
            case "recognition_end":
              if(!muted)
              {
                console.log('Agent ends recognizing');
                changeSpeechButton(false);
              }
              break;
              
            // just change this if the tablet is not muted
            case "speech_start":
              muted = true;
              changeSpeechButton(false);
              animateSpeechButton(false);
              break;
                
            case "speech_end":
              muted = false;
              changeSpeechButton(true);
              animateSpeechButton(false);
              break;
          }
          break;
        
        case "return_data":
          loadData(json.data_type, json.data);
          break;

        case "info":
          if(json.data.includes("connected to session with token")){
            loadData('people')//requestData();
            connected_to_session = true;
          }

          if(json.data.includes("disconnected from session"))
          {
            connected_to_session = false;
            mute = true;
            showPlayButton(true);
            showSpeechButton(false);
            animateSpeechButton(false);
            showInput(false);
            
            var footer = document.getElementsByTagName("footer")[0];
            footer.style.visibility = "visible";
           
            setEvents()
          }
          break;
      }
    }
    catch (e) {
      console.log('This doesn\'t look like a valid JSON: ',  json);
      return;
    }
  };
  return connection;
}

// Insert cxode below in respective buttons
var date = new Date();
var hours = (date.getHours()>9)? date.getHours(): "0"+date.getHours();
var minutes = (date.getMinutes()>9)? date.getMinutes(): "0"+date.getMinutes();
var seconds = (date.getSeconds()>9) ? date.getSeconds(): "0"+date.getSeconds();
var timestamp = hours+ ":"+ minutes+":"+seconds;

function showQuestionnaire(){
  var muteBtn = document.getElementById("mute-btn");
  muteBtn.style.visibility = "hidden";

  questionnaire_active = true;
  var q = document.getElementById("questionnaire");
  q.children[0].src = "https://docs.google.com/forms/d/e/1FAIpQLSc_fWSRn40zUxBiV9kaHPWm7eFJ585Tp1N75BR50yf9X7nfrw/viewform?embedded=true";
}
function onLoad(v, t=1000){
  questionnaire_active = !questionnaire_active;
  if(!v){
    setTimeout(function(){
      var q = document.getElementById("questionnaire");
      q.style.visibility = "hidden";
    }, t)
  }else{
    
      document.getElementById("questionnaire").style.visibility = "visible"
    }
}
function goBack(){
  onLoad(questionnaire_active,0)
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
