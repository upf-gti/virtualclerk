//Minds are components in charge of coming with an answer to a given question

//used to send question to a remote server 
function MindRemote()
{
	this.socket = null;
	this.onMessage = null;
	this.pendentMessages = [];
}

MindRemote.prototype.connect = function( url, on_connected, on_error )
{
	if(this.socket && this.socket.readyState == WebSocket.OPEN)
		this.socket.close();

	var that = this;
	this.socket = new WebSocket(  url );
	this.socket.onopen = () => {
		console.log("SENDING CONNECTING MESSAGE");
		for(let i = 0; i< this.pendentMessages.length; i++) {
			this.sendMessage(this.pendentMessages[i]);
		}
		this.pendentMessages = [];
		/*this.send( JSON.stringify( { type:"connect", url : "ws://dtic-recepcionist-kbnli.s.upf.edu:8765" } ) )*/
		if(on_connected)
			on_connected();
	};
	this.socket.onmessage = this.processServerMessage.bind(this);		
	this.socket.onerror = on_error;
	this.socket.onclose = () =>
	{
		console.warn("Connection closed:", url)
		//setTimeout(that.connect(url),1000)
	}
}

MindRemote.prototype.requestAnswer = function( question )
{
	var msg = { 
		type: "request",
		content: question
	};
	 return this.sendMessage(msg);
}

MindRemote.prototype.sendMessage = function( message )
{
	if(!this.socket || this.socket.readyState != WebSocket.OPEN)
	{
		console.log("no connection");
		if(this.socket.readyState == WebSocket.CLOSED) {
			this.pendentMessages.push(message);
			this.socket = new WebSocket( this.socket.url)
		}
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
	//console.log(msg);
	if(this.onMessage)
		this.onMessage(msg);
}
export {MindRemote}