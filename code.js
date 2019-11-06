window.SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
var recognition = new window.SpeechRecognition()
var final_transcript = "";
var start_recognition = false;
var CORE = {
	log_container: null,
	socket: null,
	init: function ( root )
	{
		var that = this;
		root = root || document.querySelector(".console");
		if(!root)
			throw("no console found");

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
			if(e.keyCode == 13)
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
		recognition.onresult = function(event) {
			var interim_transcript = '';
			if (typeof(event.results) == 'undefined') {
				recognition.onend = null;
				recognition.stop();
				
				return;
			}
		
			for (var i = event.resultIndex; i < event.results.length; ++i) {
			  if (event.results[i].isFinal) {
				final_transcript += event.results[i][0].transcript;
				mic.class ="";
			  } else {
				interim_transcript += event.results[i][0].transcript;
			  }
			}
			//that.startRecognition();
			final_transcript = capitalize(final_transcript);
			that.input.value = final_transcript;
		}
		recognition.onspeechend = function(event)
		{
			mic.setAttribute("class","");
		}
		//character
		var iframe = this.iframe = document.querySelector("#character iframe");
		iframe.src = "https://webglstudio.org/latest/player.html?url=fileserver%2Ffiles%2Fevalls%2Fprojects%2Fscenes%2FLaraFacialAnimations.scene.json";

		//use server
		//this.connectToServer("dtic-recepcionist-kbnli.s.upf.edu:8765");

		//use local
		this.mind = new MindTest();
		this.mind.onMessage = this.processMessage.bind(this);

		this.mind_flow = new MindDialogFlow();

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
		if(!this.mind)
			return;

		this.showMessage( text_message, "me" );
		this.mind.requestAnswer( text_message );
	},

	processMessage: function( msg )
	{
		//show on console
		this.showMessage( msg.content );

		var obj = { speech: { text: msg.content } };

		//show on character
		if(!CORE.iframe.contentWindow.LS)
			return;
		var LS = CORE.iframe.contentWindow.LS;
		LS.Globals.processMsg(JSON.stringify(obj), true);
	},

	processCommand: function( command ) //starting with '/'
	{
		//TODO
	},

	showMessage: function(msg, className)
	{
		var div = document.createElement("div");
		div.innerHTML = msg;
		div.className = "msg " + (className||"");
		this.log_container.appendChild(div);
		this.log_container.scrollTop = 100000;
		return div;
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