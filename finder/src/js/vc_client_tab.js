function init_websocket () {
  // if user is running mozilla then use it's built-in WebSocket
  window.WebSocket = window.WebSocket || window.MozWebSocket;
  var muted = false;
  var connection = new WebSocket('wss:dtic-recepcionist.upf.edu/port/3001/ws/');
  if(connection.readyState == WebSocket.CONNECTING)
  {
    // var container = document.getElementById("err-container");
    // container.innerText ="Connecting...";
  }
  connection.onopen = function () {
    // connection is opened and ready to use
    console.log("Connection opened");
    // var container = document.getElementById("err-container");
    // container.innerText ="";
  };

  connection.onerror = function (error) {
    // an error occurred when sending/receiving data
    // var container = document.getElementById("err-container");
    // container.innerText ="Error:\n" + JSON.stringify(error)+ "\n\n";
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
            var btn = document.getElementById("play-btn");
            btn.style.visibility = "hidden";
            var speech_btn = document.getElementById("speech-btn");
            speech_btn.style.visibility = "hidden";
            var cnt = document.getElementById("buttons-container");
            cnt.style.display ='None'; 

          break;

        case "request_map":
            // json.type = "request_map"
            // json.data = url donde esta el mapa
            // tablet decides when to hide map
          var container = document.getElementById("msg-container");
          container.innerText ="BEHAVIOUR " + time + JSON.stringify(json.behaviours) + "\n\n"
          break;

        case "app_action":
          if(json.action == "end_conversation")
          {
            var btn = document.getElementById("play-btn");
            if(btn.classList.contains("w3-gray-color"))
            {
                btn.classList.remove("w3-gray-color");
                btn.classList.add("w3-red-color");
            }
            btn.style.visibility = "visible";
            var waiting_cnt = document.getElementById("waiting-container")
            waiting_cnt.style.visibility = "visible";
          }

          if(json.action == "mute_toggled")
          {
            muted = !muted;
            var speech_btn = document.getElementById("speech-btn");

            if(muted==true)
              if(!speech_btn.classList.contains('muted'))
                speech_btn.classList.add('muted');
            
            else
              if(speech_btn.classList.contains('muted'))
                speech_btn.classList.remove('muted');
            
          }

          if(json.action == "recognition_start")
          {
            console.log('Agent starts recognizing');
            var btn = document.getElementById("play-btn");
            btn.style.visibility = "hidden";
            
            var speech_btn = document.getElementById("speech-btn");
            speech_btn.classList.add("w3-red-color");
            speech_btn.style.visibility = "visible";
          }

          if(json.action == "recognition_end")
          {
            if(!muted)
            {
              console.log('Agent ends recognizing');
              var speech_btn = document.getElementById("speech-btn");
              speech_btn.style.visibility = "hidden";
  
              var btn = document.getElementById("play-btn");
              btn.style.visibility = "visible";
            }
          }

          
          // just change this if the tablet is not muted
          if(json.action == "speech_start")
          {
            if(!muted)
            {
              console.log('User starts talking');
              var speech_btn = document.getElementById("speech-btn");
              if(!speech_btn.classList.contains('anim'))
                speech_btn.classList.add('anim');
            }
          }

          if(json.action == "speech_end")
          {
            if(!muted)
            {
              console.log('User ends talking');
              var speech_btn = document.getElementById("speech-btn");
              if(speech_btn.classList.contains('anim'))
                speech_btn.classList.remove('anim');
            }
          }
          break;
        
        case "return_data":
          loadData(json.data_type, json.data);
          break;
        case "info":
          if(json.data.includes("connected to session with token"))
            requestData();
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
