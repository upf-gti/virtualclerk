window.SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
//window.SpeechGrammarList = window.webkitSpeechGrammarList || window.SpeechGrammarList;
var recognition = new window.SpeechRecognition();

recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.maxAlternatives = 1;
var final_transcript = "";
var start_recognition = false;

var state = 2; //WAITING
var counter = 0;

var recognition_enabled = false;

var url = "dtic-recepcionist.upf.edu/port/8765/ws/" //"ws://dtic-recepcionist-kbnli.s.upf.edu:8765"//webglstudio.org/port/9001/ws/"//"dtic-recepcionist-kbnli.s.upf.edu:8765";
var tabUrl = "dtic-recepcionist.upf.edu/port/3001/ws/"
//var tabUrl = "dtic-recepcionist.upf.edu:3001"
var CORE = {
	socket: null,
	isFirstMsg:true,
	lastQuestion: "",
	finder: null,
	start: false,
	init: function (  )
	{
		var that = this;
		//character
		var iframe = this.iframe = document.querySelector("#character iframe");
		//iframe.src = "https://webglstudio.org/latest/player.html?url=fileserver%2Ffiles%2Fevalls%2Fprojects%2FDTICReceptionist%2FRecepcionistaDTIC.scene.json&autoplay=true"//"https://webglstudio.org/latest/player.html?url=fileserver%2Ffiles%2Fevalls%2Fprojects%2Fscenes%2FLaraFacialAnimations.scene.json";
		
		var player = new LS.Player({
			width:800, height:600,
			resources: "scene",
			container_id:"character"
		});
		
		player.loadScene("scene/scene.json", function(){this.globals = window}.bind(this));
		//document.querySelector("#character").appendChild( player.canvas )
		window.onmessage = this.appLoop.bind(this)

		//-------------------------------------------------------Recognition Events
		recognition.onstart = function(event){
			start_recognition = true;
			console.log("Recognition Start");
		
		}

		recognition.onaudiostart = function()
		{
			var that = this;
			if(that.tabRemote)
				that.tabRemote.sendMessage({type: "app_action", action: "recognition_start" })
		}.bind(this)
		recognition.onaudioend = function()
		{
			var that = this;
			if(that.tabRemote)
				that.tabRemote.sendMessage({type: "app_action", action: "recognition_end" })
		}.bind(this)

		recognition.onspeechstart = function(){
			//var LS = CORE.iframe.contentWindow ? CORE.iframe.contentWindow.LS : window.LS;
			var LS = window.LS;
			if(LS)
			{
				state = LS.Globals.LISTENING;
				LS.Globals.processMsg(JSON.stringify({control:LS.Globals.LISTENING}), true);
			}
			
			// console.log("LISTENING(speech start)")
			var that = this;
			if(that.tabRemote)
				that.tabRemote.sendMessage({type: "app_action", action: "speech_start" })

		}.bind(this)
		recognition.onspeechend = function(){
			var LS = window.LS;

			if(LS)
			{
				state = LS.Globals.PROCESSING;
				LS.Globals.processMsg(JSON.stringify({control:LS.Globals.PROCESSING}), true);
			}
			var that = this;
			if(that.tabRemote)
				that.tabRemote.sendMessage({type: "app_action", action: "speech_end" })
			// console.log("PROCESSING (speech end)")
			
		}.bind(this)

		recognition.onend = function(event){
			console.log("Recognition stopped from recognition.onend()");
			start_recognition = false;

		}
		recognition.onresult = function(event) {
			var interim_transcript = '';
			if (typeof(event.results) == 'undefined') {
				return;
			}

			for (var i = event.resultIndex; i < event.results.length; ++i) {

			  if (event.results[i].isFinal) {
				var LS = window.LS;
				//LS.Globals.processMsg(JSON.stringify({control:1}), true); //processing
				state = LS.Globals.PROCESSING;

				final_transcript += event.results[i][0].transcript;
				
				interim_transcript = ""

			  } else {
				interim_transcript += event.results[i][0].transcript;
			  }
			}
			//that.startRecognition();
			final_transcript = capitalize(final_transcript);

			that.userMessage( final_transcript );
		
			final_transcript = "";
			recognition.stop();
		}


		//use TALN server
		var protocol = location.protocol == "https:" ? "wss://" : "ws:";
		//var protocol = "ws://"
		this.mindRemote = new MindRemote();
		this.mindRemote.connect(protocol+url, this.onConnectionStarted.bind(this), this.onConnectionError.bind(this, "nlp"));
		this.mindRemote.onMessage = this.processMessage.bind(this);
		// connect to Tablet Server
		this.tabRemote = new MindRemote();
		this.tabRemote.connect(protocol+tabUrl, this.onConnectionStarted.bind(this), this.onConnectionError.bind(this,"tablet"));
		this.tabRemote.onMessage = this.processTabletMessage.bind(this);
		var that = this;

		//Reconnecting Modal
		var modal = document.getElementById("reconnecting");
		var span = document.getElementById("reconnecting-close");
		// When the user clicks on <span> (x), close the modal
		span.onclick = function() {
		 
			modal.style.display = "none";
		}

		//Server session Modal
		var s_modal = document.getElementById("session");
		var s_span = document.getElementById("session-close");
		var btn_session = document.getElementById("btn-session");
		btn_session.addEventListener("click", function(){
			
			var s_input = document.getElementById("token");
			if(that.tabRemote.socket && that.tabRemote.socket.readyState== WebSocket.OPEN)
			{
				that.tabRemote.sendMessage({type: "session", data: {action: "vc_connection", token: s_input.value}})
				s_modal.style.display = "none";
				//Wait for server response (client connected to this session)!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
			}
			else{
				s_modal.innerText = "Try again in a few minutes."
			}
		})
		// When the user clicks on <span> (x), close the modal
		s_span.onclick = function() {
			var s_input = document.getElementById("token");
			if(s_input.value!="")
				s_modal.style.display = "none";
		}
	

	},
	appLoop: function()
	{

		if(window && this.start)
		{
			if(this.isFirstMsg)
			{
				this.mindRemote.sendMessage( {type:"start", content:""} );
				this.isFirstMsg = false;
				recognition_enabled = true;
				//if(start_recognition) recognition.stop()
				window.requestAnimationFrame(this.appLoop.bind(this));
				return;
			}
			var LS = window.LS;
			if(LS.Globals){

				var isSpeaking = LS.Globals.speaking;
		
				if(isSpeaking&&start_recognition)
				{
					recognition.stop();
					state = LS.Globals.PROCESSING
					LS.Globals.processMsg(JSON.stringify({control: state}), true);
					
				}
				else if(!isSpeaking&&!start_recognition&&recognition_enabled)
				{
					recognition.start();
					if(state==LS.Globals.SPEAKING)
					{
						state = LS.Globals.LISTENING;

						LS.Globals.processMsg(JSON.stringify({control: state}), true);
					}
				}
			}
		}
		if(state == 0)
			counter++;
		if(counter>5000)
		{
			state = LS.Globals.WAITING;
			LS.Globals.processMsg(JSON.stringify({control: LS.Globals.WAITING}), true);
			counter = 0;
		}
		window.requestAnimationFrame(this.appLoop.bind(this));

	},
	onConnectionStarted: function(data)
	{
		console.log("Connection started! " + data)
		//setTimeout(this.mindRemote.sendMessage( {type:"start", content:""} ), 10000)
		this.displayModal(false);
		
		recognition.continuous = true;

	},
	onConnectionError: function(server, error)
	{
		console.log(error)
		this.isFirstMsg = true;
		this.displayModal(true, "Connection error. Trying to reconnect.");
		var that = this;
		
		setTimeout(function(){
			var protocol = location.protocol == "https:" ? "wss://" : "ws:";
			//var protocol = "ws://"
			if(server == "nlp")
				that.mindRemote.connect(protocol+url, that.onConnectionStarted.bind(that), that.onConnectionError.bind(that,"nlp"));
			else if(server == "tablet")
				that.tabRemote.connect(protocol+tabUrl, that.onConnectionStarted.bind(that), that.onConnectionError.bind(that,"tablet"));
		},5000);
	},

	userMessage: function( text_message )
	{
		
		var mind = this.mindRemote;
	
		text_message = text_message.replace(/\b\w/g, l => l.toUpperCase());

		if(text_message.toLowerCase().includes("bye") || text_message.toLowerCase().includes("shut up")){
			mind.sendMessage( {type:"end", content:""} );
		
		}
			mind.requestAnswer( text_message );

	},

	processMessage: function( msg )
	{
		/*if(recognition_enabled)
		{*/
			if(msg.type=="system")
				return;
			var LS = window.LS;
			state = LS.Globals.SPEAKING;
			
			if(msg.content.text.includes("name and surname"))
			{
				
				this.tabRemote.sendMessage({type:"request_data", data: "person"});
				
				if(start_recognition) recognition_enabled = false;
			}
			var object = {};
			if(msg.content && msg.content.data)
				obj = { type: "behaviours", data: [ { type:"lg", text: msg.content.text, audio: msg.content.data.audio, start:0.1, end:4 }]}; //speaking
			else
				obj = { type: "behaviours", data: [ { type:"lg", text: msg.content.text,  start:0.1, end:4 }]};
			if(msg.content.text.includes("Hi"))
				obj.data.push({type:"faceEmotion", emotion: "HAPPINESS", amount:0.5,start:0, end:0.5 })
			//show on console
			if(msg.type == "request")
			{
				if(this.isFirstMsg && msg.content!="")
				{
					this.isFirstMsg = false;
					//obj["gesture"] = {lexeme:"wave"};
				}
				/*else{
	
					if(Math.random()<0.5)
						obj.data.push({type:"gesture",lexeme:"speaking", start:0, end:2});
				}*/
		
			}
	
			if(msg.content == "See you next time, bye.")
			{
				this.isFirstMsg = true;
				this.start = false;
				if(start_recognition) recognition.stop();
				this.tabRemote.sendMessage({type: "app_action", action:"end_conversation"});
			}
	
			console.log("message processed: " + msg.content)
	
					//show on character
			if(!window.LS)
				return;
			var LS = window.LS;
	
			var places = ["cafeteria", "bar", "library", "auditori","auditorium", "restaurant", "secretaria", "library", "550" ,"551", "552", "553","554"];
	
			for(var i in places)
			{
				var place = places[i];
	
				if(msg.content.text.toLowerCase().includes(place))
				{
	
					//if(Math.random()<0.5)
					/*obj.data.push({type:"gesture",lexeme:"show", start:0, ready:1, strokeStart:1.5, end:3});*/
					if(place=="secretaria")
						place="550";
					if(place=="auditorium")
						place="auditori"
					if(place == "bar" || place == "restaurant")	  //hardcoded
						place = "cafeteria";
	
					var path = "https://webglstudio.org/projects/virtualclerk/imgs/mapa-"+ place + ".jpg";
					var LSQ = window.LSQ;
					LS.RM.load(path);
					var map = LSQ.get("map");
					var woman = LSQ.get("background");
					if(map && woman)
					{
						map.material.textures.color.texture = path;
						var mapPos = map.transform.position.clone();
						var mapTarget = LSQ.get("mapTarget").transform.position;
						LS.Tween.easeProperty( map.transform, "position", mapTarget, 1)
						setTimeout(function(){LS.Tween.easeProperty(map.transform, "position", mapPos, 1)}	, 8000)
		/*				var cameraPos = LS.GlobalScene.root.camera.center.clone();
						LS.Tween.easeProperty( LS.GlobalScene.root.camera, "center", map.transform.position, 3 )
						setTimeout(function(){LS.Tween.easeProperty( LS.GlobalScene.root.camera, "center", cameraPos, 3 )}	, 8000)*/
					}
				}
			}
	
			LS.Globals.processMsg(JSON.stringify(obj), true);
		/*}*/

	}, 
	processTabletMessage: function(message) // messages recieved from RecepcionistaDTIC Tablet
	{
		// try to decode json (I assume that each message
		// from server is json)
		try {
			var json = message;
			console.log(json);
			//Get current time
			var date = new Date();
			var hours = (date.getHours()>9)? date.getHours(): "0"+date.getHours();
			var minutes = (date.getMinutes()>9)? date.getMinutes(): "0"+date.getMinutes();
			var seconds = (date.getSeconds()>9) ? date.getSeconds(): "0"+date.getSeconds();
			var time = hours+ ":"+ minutes+":"+seconds;
	
			//Show messages
			switch (json.type) 
			{
				case "response_data":
					
					this.mindRemote.requestAnswer( json.data );
					recognition_enabled = true;
					// json.data;
					break;
		
				case "tab_action":
					if(json.action == "init_conversation")
					{
						//start_conversation
						this.start = true;
					}
					if(json.action == "mute")
					{
						//disable recognition in the app so it does not try to listen as the tablet is muted
						recognition_enabled = !recognition_enabled;
						recognition.stop()
						// Sennd ACK message to tablet to change styles, views...
						if(this.tabRemote)
						{
							// console.log("Sending mute message");
							this.tabRemote.sendMessage({type: "app_action", action: "mute_toggled" })
													}
					}
					break;
			}
		}
		catch (e) {
			console.log('This doesn\'t look like a valid JSON: ',  message.data);
			return;
		}
	},
	displayModal: function (showModal, msg) {

		var modal = document.getElementById("reconnecting");

		if(showModal && msg)
		{
			var content = document.getElementById("modal-msg");
			content.innerHTML = msg;
			modal.style.display = "block";
		}
		else
			modal.style.display = "none";


	},
	
};
var first_char = /\S/;
function capitalize(s) {
  return s.replace(first_char, function(m) { return m.toUpperCase(); });
}

function eventFire(el, etype){
	if (el.fireEvent) {
	  el.fireEvent('on' + etype);
	} else {
	  var evObj = document.createEvent('Events');
	  evObj.initEvent(etype, true, false);
	  el.dispatchEvent(evObj);
	}
  }
  