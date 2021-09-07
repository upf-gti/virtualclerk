window.SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
//window.SpeechGrammarList = window.webkitSpeechGrammarList || window.SpeechGrammarList;
var recognition = new window.SpeechRecognition();

recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.maxAlternatives = 1;
var final_transcript = "";
var start_recognition = false;
const modes = { DEBUG:0, RELEASE:1 };

var state = 2; //WAITING
var counter = 0;

var url = "webglstudio.org/port/9001/ws/"//"dtic-recepcionist-kbnli.s.upf.edu:8765";
var CORE = {
	log_container: null,
	socket: null,
	isFirstMsg:true,
	useLocal: false,
	mode: modes.RELEASE,
	lastQuestion: "",
	finder: null,
	start: false,
	init: function ( root )
	{
		//finder = window.open("./finder/index.html", "secondary");
		var that = this;

		root = root || document.querySelector(".console");
		if(!root)
			throw("no console found");


		/*recognition.onspeechstart = function() {
		  console.log('Speech has been detected');
		}*/
		if(this.mode == modes.DEBUG)
		{
			// D E B U G
			//---------------------input TEXT-------------------------
			//init interface
			this.log_container = root.querySelector(".log");
			this.input = root.querySelector(".typing input");
			var button = root.querySelector(".typing button");
			button.addEventListener("click",function(e){
				if(that.input.value == "")
					return;
				if(that.input.value[0] == "/")
					that.processCommand( that.input.value.substr(1) );
				else
					that.userMessage( that.input.value );
				that.input.value = "";
			});

			this.input.addEventListener("keydown",function(e){
				if(e.keyCode == 13) //enter
				{
					if(this.value == "")
						return;
					if(this.value[0] == "/")
						that.processCommand( this.value.substr(1) );
					else
						that.userMessage( this.value );
					this.value = "";
					return;
				}
			});

			//---------------------input MIC-------------------------
			var mic = root.querySelector(".typing button#mic ");

			mic.addEventListener("click",function(e){
				if(start_recognition){
					recognition.stop();
					start_recognition = false;
				}
				else{
					recognition.start();
					start_recognition = true;
					mic.setAttribute("class","animated");
					that.input.value = "";
				}
				//that.startRecognition(this);

			});
			recognition.onspeechend = function(event)
			{

				mic.setAttribute("class","");
			}
		}
//		----------------------------------------------------
		//character
		var iframe = this.iframe = document.querySelector("#character iframe");
		iframe.src = "https://webglstudio.org/latest/player.html?url=fileserver%2Ffiles%2Fevalls%2Fprojects%2FDTICReceptionist%2FRecepcionistaDTIC.scene.json&autoplay=true"//"https://webglstudio.org/latest/player.html?url=fileserver%2Ffiles%2Fevalls%2Fprojects%2Fscenes%2FLaraFacialAnimations.scene.json";

		if(!CORE.iframe.contentWindow)
			return;

		window.onmessage = this.appLoop.bind(this)

		//-------------------------------------------------------Recognition Events
		recognition.onstart = function(event){
			start_recognition = true;
			console.log("Recognition Start");
			var that = this;
			if(that.tabRemote)
				that.tabRemote.sendMessage({type: "app_action", action: "recognition_start" })
			//var LS = CORE.iframe.contentWindow.LS;
			//LS.Globals.processMsg(JSON.stringify({control:3}), true); //listening
		}
		/*recognition.onaudiostart = function()
		{
			var that = this;
			if(that.tabRemote)
				that.tabRemote.sendMessage({type: "app_action", action: "speech_start" })
		}.bind(this)*/
		recognition.onaudioend = function()
		{
			var that = this;
			if(that.tabRemote)
				that.tabRemote.sendMessage({type: "app_action", action: "recognition_end" })
		}.bind(this)

		recognition.onspeechstart = function(){
			var LS = CORE.iframe.contentWindow.LS;
			if(LS)
			{
				state = LS.Globals.LISTENING;
				LS.Globals.processMsg(JSON.stringify({control:LS.Globals.LISTENING}), true);
			}
			var that = this;
			if(that.tabRemote)
				that.tabRemote.sendMessage({type: "app_action", action: "speech_start" })
			console.log("LISTENING(speech start)")

		}.bind(this)
		recognition.onspeechend = function(){
			var LS = CORE.iframe.contentWindow.LS;

			if(LS)
			{
				state = LS.Globals.PROCESSING;
				LS.Globals.processMsg(JSON.stringify({control:LS.Globals.PROCESSING}), true);
			}
			var that = this;
			if(that.tabRemote)
			that.tabRemote.sendMessage({type: "app_action", action: "speech_end" })
			console.log("PROCESSING (speech end)")
			
		}.bind(this)
		recognition.onend = function(event){
			console.log("Recognition stopped");
			start_recognition = false;

		}
		recognition.onresult = function(event) {
			var interim_transcript = '';
			if (typeof(event.results) == 'undefined') {
				return;
			}

			for (var i = event.resultIndex; i < event.results.length; ++i) {

			  if (event.results[i].isFinal) {
				var LS = CORE.iframe.contentWindow.LS;
				//LS.Globals.processMsg(JSON.stringify({control:1}), true); //processing
				state = LS.Globals.PROCESSING;

				final_transcript += event.results[i][0].transcript;
				if(this.mode == modes.DEBUG){
					mic.class ="";
				}
				interim_transcript = ""

			  } else {
				interim_transcript += event.results[i][0].transcript;
			  }
			}
			//that.startRecognition();
			final_transcript = capitalize(final_transcript);

			if(this.mode == modes.DEBUG)
			{
				that.input.value = final_transcript;
			}
			console.log("USER SPEECH: "+final_transcript)
			if(that.mode == modes.RELEASE){
				that.userMessage( final_transcript );


			}
			final_transcript = "";
			recognition.stop();
		}


		//use TALN server
		this.mindRemote = new MindRemote();
		this.mindRemote.connect(url, this.onConnectionStarted.bind(this), this.onConnectionError.bind(this));
		this.mindRemote.onMessage = this.processMessage.bind(this);
		// connect to Tablet Server
		this.tabRemote = new MindRemote();
		this.tabRemote.connect("webglstudio.org/port/9004/ws/", this.onConnectionStarted.bind(this), this.onConnectionError.bind(this));
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

		
		var iframeDoc = document.querySelector("iframe").contentWindow.document;
		iframeDoc.addEventListener("keydown", function(event){
			event.preventDefault();
			event.stopPropagation();

			if(event!=undefined && event.keyCode == 68){
				var console = document.querySelector(".console");
				var character = document.querySelector("#character");
				var main = document.querySelector("#main");

				if(console.style.display === "none")

				{
					main.classList.add("debug");
					//main.classList.remove("release");
					character.style.width = "50%";
					console.style.display = "block";
					that.mode = modes.DEBUG;

					//iframe.src = "https://webglstudio.org/latest/player.html?url=fileserver%2Ffiles%2Fevalls%2Fprojects%2Fscenes%2FLaraFacialAnimations.scene.json";

				}
				else{
					//main.classList.add("release");
					main.classList.remove("debug");
					console.style.display = "none";
					character.style.width = "100%";
					//iframe.src = "https://webglstudio.org/latest/player.html?url=fileserver%2Ffiles%2Fevalls%2Fprojects%2Fscenes%2FLaraFacialAnimations.scene.json";
					that.mode = modes.RELEASE;
				}
			}
		});

			/*var LS = CORE.iframe.contentWindow.LS;
			if(LS !=undefined && LS.Globals.speechController.isSpeaking)
				console.log("SPEAKING")
			else
				recognition.start();*/
	//finder.onload = setEvents

	},
	appLoop: function()
	{

		if(CORE.iframe.contentWindow.LS && this.start)
		{
			if(this.isFirstMsg)
			{
				this.mindRemote.sendMessage( {type:"start", content:""} );
				this.isFirstMsg = false;
				recognition.stop();
				start_recognition = false;
				window.requestAnimationFrame(this.appLoop.bind(this));
				return;
			}
			var LS = CORE.iframe.contentWindow.LS;
			if(LS && LS.Globals){
				//recognition.start();

				var isSpeaking = LS.Globals.speaking;
				/*if(finder&&finder.current_input!="")
				{
					this.userMessage(finder.current_input)
					finder.current_input = "";
				}*/
				if(isSpeaking&&start_recognition)
				{
					recognition.stop();
					start_recognition = false;
					state = LS.Globals.PROCESSING
						LS.Globals.processMsg(JSON.stringify({control: state}), true);
					console.log("stop")
				}
				else if(!isSpeaking&&!start_recognition)
				{
					console.log("start")
					recognition.start();
					start_recognition = true;
					if(state==LS.Globals.SPEAKING)
					{
						state = LS.Globals.LISTENING;

						LS.Globals.processMsg(JSON.stringify({control: state}), true);
					}
				}
			}
		}/* else
		{
			setTimeout(this.appLoop().bind(this), 5000);
		}  */
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
		if(this.mode == modes.RELEASE)
		{
			// R E L E A S E
			//recognition.start();
			//setTimeout(recognition.start()
			//,1000);
			recognition.continuous = true;

		}


	},
	onConnectionError: function(error)
	{
		console.log(error)
		this.isFirstMsg = true;
		this.displayModal(true, "Connection error. Trying to reconnect.");
		var that = this;
		//var LS = CORE.iframe.contentWindow.LS;
		//LS.Globals.processMsg(JSON.stringify({control:0}), true); //waiting
		//recognition.stop();

		setTimeout(function(){
			that.mindRemote.connect(url, that.onConnectionStarted.bind(that), that.onConnectionError.bind(that));
		},5000);
	},
	connectToServer: function(url)
	{
		var that = this;
		var protocol = location.protocol == "https:" ? "wss://" : "ws:";
		var url = protocol + url;//CORE.server_url;
		this.connect(url, function(){
			that.showMessage("Welcome, ask me anything","sys");
		});
	},

	userMessage: function( text_message )
	{
		//if(!this.mind)
		var mind = this.mindRemote;
		/*if(this.useLocal)
			mind = this.mind;/*
/*		if(!this.mindRemote)
			return;*/
		if(this.mode == modes.DEBUG)
			this.showMessage( text_message, "me" );
		//this.mind.requestAnswer( text_message );
		text_message = text_message.replace(/\b\w/g, l => l.toUpperCase());

		/*if(text_message.toLowerCase().includes("person"))
		{
			this.lastQuestion = "person";
			this.processMessage({type:"request", content: "Could you type the name and surname on the tablet, please?"})
			if(finder)
				finder.changeWaitingView()
			//changeWaitingView()
			return;
		}*/

		if(text_message.toLowerCase().includes("bye") || text_message.toLowerCase().includes("shut up")){
			mind.sendMessage( {type:"end", content:""} );
			//this.isFirstMsg = true;
		//	return;
		}
	/*	if(this.isFirstMsg)
		{

			//this.mindRemote.sendMessage( {type:"start", content:""} );
			mind.sendMessage( {type:"start", content:""} );
				mind.requestAnswer( "Hi" );
		}
		else
		{*/
//			this.mindRemote.requestAnswer( text_message );
			mind.requestAnswer( text_message );
	/*	}*/

	},

	processMessage: function( msg )
	{
		if(msg.type=="system")
			return;
		var LS = CORE.iframe.contentWindow.LS;
		state = LS.Globals.SPEAKING;
		if(msg.content.includes("name and surname"))
		{
			//msg.content = "Could you type the name and surname on the tablet, please?";
			/*if(finder)
				finder.changeWaitingView()*/
			this.tabRemote.sendMessage({type:"request_data", data: "person"});
		}
		var obj = { speech: { text: msg.content }, control: LS.Globals.SPEAKING }; //speaking
		//show on console
		if(msg.type == "request")
		{
			if(this.mode == modes.DEBUG)
				this.showMessage( msg.content );
			if(this.isFirstMsg && msg.content!="")
			{
				this.isFirstMsg = false;
				//obj["gesture"] = {lexeme:"wave"};
			}
			else{

				if(Math.random()<0.5)
					obj["gesture"] = {lexeme:"speaking"};
			}
			;
		}

		if(msg.content == "See you next time, bye.")
		{
			this.isFirstMsg = true;
			this.start = false;
			recognition.stop();
			start_recognition = false;
			/*if(finder.start)
				finder.resetView()*/
			this.tabRemote.sendMessage({type: "app_action", action:"end_conversation"});
		}

		console.log("message processed: " + msg.content)

				//show on character
		if(!CORE.iframe.contentWindow.LS)
			return;
		var LS = CORE.iframe.contentWindow.LS;

		var places = ["cafeteria", "bar", "library", "auditori","auditorium", "restaurant", "secretaria", "library", "550" ,"551", "552", "553","554"];

		for(var i in places)
		{
			var place = places[i];

			if(msg.content.toLowerCase().includes(place))
			{

				//if(Math.random()<0.5)
				obj["gesture"] = {lexeme:"show", start:0, ready:1, strokeStart:1.5, end:3};
				if(place=="secretaria")
					place="550";
				if(place=="auditorium")
					place="auditori"
				if(place == "bar" || place == "restaurant")	  //hardcoded
					place = "cafeteria";

				var path = "https://webglstudio.org/projects/virtualclerk/imgs/mapa-"+ place + ".jpg";
				var LSQ = CORE.iframe.contentWindow.LSQ;
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

	}, 
	processTabletMessage: function(message) // messages recieved from RecepcionistaDTIC Tablet
	{
		// try to decode json (I assume that each message
		// from server is json)
		try {
			var json = message;
	
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
					// json.data;
					break;
		
				case "tab_action":
					if(json.action == "init_conversation")
					{
						//start_conversation
						this.start = true;
					}
					break;
			}
		}
		catch (e) {
			console.log('This doesn\'t look like a valid JSON: ',  message.data);
			return;
		}
	},
	/*processCommand: function( command ) //starting with '/'
	{
		//TODO
	},*/

	showMessage: function(msg, className)
	{
		var div = document.createElement("div");
		div.innerHTML = msg;
		div.className = "msg " + (className||"");
		this.log_container.appendChild(div);
		this.log_container.scrollTop = 100000;
		return div;

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
	onKeyDown: function(event){
		if(event!=undefined && event.key.toUpperCase() == "D"){
			var console = document.querySelector(".console");
			if(console.style.display === "none")
			{
				console.style.display = "block";
				this.mode = modes.REALASE;
			}
			else{
				console.style.display = "none";
				this.mode = modes.DEBUG;
			}
		}
	}
};
var first_char = /\S/;
function capitalize(s) {
  return s.replace(first_char, function(m) { return m.toUpperCase(); });
}

//easier
function log( msg, className )
{
	return CORE.showMessage( msg, className );
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
  /* IPAD VIEW CODE */
 /* function changeWaitingView()
{
    var div = finder.document.getElementById("waiting-container");
	if(div.style.visibility == "hidden")
	{
		div.style.visibility = "visible";
	}
	else
		div.style.visibility = "hidden";
}
function setEvents()
{
	if(!finder)
		return;

	finder.document.getElementById("person-toggle").addEventListener("click", function() {
        var active_filters = document.getElementsByClassName('active');


        if(this.classList.contains("active"))
        {
            updateListDB()
            return;
        }
        else
        {
            var actives = finder.document.getElementsByClassName("active");
            for(var i = 0; i< actives.length; i++)
            {
                actives[i].classList.remove("active");
            }
            this.classList.add("active");
            BUILDING_TYPE = false
            PERSON_TYPE = true
            GROUP_TYPE = false
        }
        updateListDB()


    });
    finder.document.getElementById("group-toggle").addEventListener("click", function() {
        var active_filters = finder.document.getElementsByClassName('active');


        if(this.classList.contains("active"))
        {
            updateListDB()
            return;
        }
        else
        {
            var actives = finder.document.getElementsByClassName("active");
            for(var i = 0; i< actives.length; i++)
                actives[i].classList.remove("active");

            this.classList.add("active");
            BUILDING_TYPE = false
            PERSON_TYPE = false
            GROUP_TYPE = true
        }

        updateListDB()

    });
    finder.document.getElementById("building-toggle").addEventListener("click", function() {
        var active_filters = finder.document.getElementsByClassName('active');

        if(this.classList.contains("active"))
        {
            updateListDB()
            return;

        }
        else
        {

            var actives = finder.document.getElementsByClassName("active");
            for(var i = 0; i< actives.length; i++)
            {
                actives[i].classList.remove("active");
            }
            this.classList.add("active");
            BUILDING_TYPE = true
            PERSON_TYPE = false
            GROUP_TYPE = false
        }
        updateListDB()

    });
    finder.document.getElementById("send-btn").addEventListener("click", function() {
        var input = finder.document.getElementById("myInput").value;
        if(!input)
            alert('You have to write and select something')
        else
        {
            CORE.mindRemote.requestAnswer( input );
			//alert('Implement sendInfo() method, and send: ' + input)

        }
    });
    // Just for the moment, to toggle the waiting screen
    finder.document.addEventListener("keypress", function(e){
        if(e.code == "Digit1")
        {
            var div = finder.document.getElementById("waiting-container");
            if(div.style.visibility == "hidden")
            {
                div.style.visibility = "visible";
            }
            else
                div.style.visibility = "hidden";
        }

    });
}
*/