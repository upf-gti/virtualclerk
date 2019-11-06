//Minds are components in charge of coming with an answer to a given question


//Mind component for testing purposes
function MindTest()
{
	this.onMessage = null;
}

MindTest.fake_answers = [
	"I don't know. Sorry.",
	"I should know that one.",
	"Thats an interesting question.",
	"Let me think about it and answer tomorrow"
];

MindTest.prototype.requestWelcomeMessage = function()
{
	var that = this;
	setTimeout(function(){
		if(that.onMessage)
			that.onMessage({
				type: "msg",
				msgType: "greeting",
				content: "Hello!"
			});
	},2000); //delay
}

MindTest.prototype.requestAnswer = function( question )
{
	var that = this;
	var answer = MindTest.fake_answers[ Math.floor(MindTest.fake_answers.length * Math.random()) ];
	setTimeout(function(){
		if(that.onMessage)
			that.onMessage({
				type: "msg",
				msgType: "answer",
				content: answer
			});
	},2000); //delay
}


//used to send question to a remote server 
function MindRemote()
{
	this.socket = null;
	this.onMessage = null;
}

MindRemote.prototype.connect = function( url, on_connected, on_error )
{
	if(this.socket && this.socket.readyState == WebSocket.OPEN)
		this.socket.close();

	var that = this;
	this.socket = new WebSocket( url );
	this.socket.onopen = on_ready;
	this.socket.onmessage = this.processServerMessage.bind(this);		
	this.socket.onerror = onerror;
	this.socket.onclose = function()
	{
		log("connection closed");
		that.socket = null;
	}
}

MindRemote.prototype.requestAnswer = function( question )
{
	var msg = { 
		type: "question",
		content: question
	};
	this.sendMessage(msg);
}

MindRemote.prototype.sendMessage = function( message )
{
	if(!this.socket || this.socket.readyState != WebSocket.OPEN)
	{
		log("no connection","sys");
		return false;
	}

	var data = JSON.stringify( message );
	this.socket.send(data);
	return true;
}


MindRemote.prototype.processServerMessage = function(event)
{
	var data = event.data;
	var msg = JSON.parse( data );
	console.log(msg);
	if(this.onMessage)
		this.onMessage(msg);
}