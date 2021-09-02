const WebSocket = require('ws');
const fs = require('fs');
const http = require('http');

var bridge_url = "ws://dtic-recepcionist-kbnli.s.upf.edu:8765";
var port = 9001;

console.log("waiting connections... port",port);

const httpserver = http.createServer(function (req, res) {
	res.write('Bridge working'); //write a response to the client
	res.end(); //end the response
},{
  //cert: fs.readFileSync('/path/to/cert.pem'),
  //key: fs.readFileSync('/path/to/key.pem')
});

//const server = new WebSocket.Server({ port: port });
const server = new WebSocket.Server({ server: httpserver });

httpserver.listen(port);

var client_id = 0;
 
server.on('connection', function connection(client) {
	client.client_id = client_id++;
	console.log("client connected:",client.client_id,formatConsoleDate(new Date()));

	//connection from server to server2
	var connection_info = null;
	client.bridge = null; //could be websocket or socket
	var timeout = null;
	var waittime = 1000;
	var ready = false;

	var interval = setInterval(function(){
		if(client && client.readyState === client.OPEN)
			client.send(JSON.stringify({type:"system",content:"session ping"}));
	},10000);
	
	function connectEvent( data )
	{
		connection_info = data;
		if(data.url)
			connectWebsocketRemote( data.url );
		else if( data.ip && data.port )
			connectSocketRemote( data.ip, data.port );
		else
		{
			console.log("wrong connection parameters");
			if(client && client.readyState === client.OPEN)
			{
				client.send(JSON.stringify({type:"system",content:"wrong connection parameters"}));
			}
		}
	}

	function connectWebsocketRemote( url )
	{
		if(!client || client.readyState !== client.OPEN)
		{
			console.log("connection canceled, client lost");
			return;
		}

		ready = false;

		console.log("connecting to websocket ",url,"...");
		client.bridge = new WebSocket(url);
		client.bridge2 = client.bridge;
		console.log("bridge is now a WebSocket" );
		client.bridge.on('open', function(){
			ready = true;
			console.log("client websocket bridge stablished",client.client_id);
			client.send(JSON.stringify({type:"system",status:1,content:"connected to websocket " + url}));
			console.log(client);
		});
		client.bridge.on("ready", function(){
			console.log("websocket bridge ready");
		});

		addConnectionEvents();
	}

	function connectSocketRemote( ip, port )
	{
		console.log("connecting to socket ",ip,port,"...");
		console.log("bridge is now a net.Socket" );
		client.bridge = new net.Socket();
		client.bridge.connect( Number(port), ip, function(){
			ready = true;
			console.log("client socket bridge stablished",ip,port);
			client.send(JSON.stringify({type:"system",status:1,content:"connected to bsocket " + ip + ":" + port}));
			//console.log(client);
		});
		client.bridge.on("ready", function(){
			console.log("socket bridge ready");
		});
		client.bridge.send = client.bridge.write;
		client.bridge.close = client.bridge.destroy;
		addConnectionEvents();
	}

	function addConnectionEvents()
	{
		client.bridge.on('message', function(data){
			if(client && client.readyState === client.OPEN)
				client.send(data);
			console.log("remote data received: ",data);
		});

		client.bridge.on('error', function(err){
			client.bridge = null;
			waittime *= 2;
			console.log("error in remote connection");
			if(waittime > 30000)
			{
				console.log("error connecting to remote server",err.code," Too many retries");
				client.send(JSON.stringify({type:"system", errcode: err.code, content:"error in remote connection. Too many tries"}));
				client.close();
				return;
			}
			console.log("error connecting to remote server, waiting to reconnect",err.code);
			client.send(JSON.stringify({type:"system", errcode: err.code, content:"error in remote connection. waiting to reconnect"}));
			setTimeout(function(){
				if(!client.bridge)
					connectEvent(connection_info);
			},waittime);
			//client.close();
		});

		client.bridge.on('close', function(status){
			console.log("remote server closed connection",status);
			if(!ready)
				return;
			client.bridge = null;
			if(client.readyState === client.OPEN)
			{
				client.send(JSON.stringify({type:"system",content:"remote connection closed"}));
				var old_client = client;
				client = null;
				setTimeout(function(){
					old_client.close();
				},100);
			}
		});
	}

	//connection from client to server
	client.on('message', function incoming( message ) {
		console.log( "MSG", message );

		if(this.bridge && this.readyState === this.bridge.OPEN)
		{
			this.bridge.send( message );
			return;
		}
		if(this.bridge)
			console.log("socket is in mode: ",this.bridge.readyState);
		else
		{
			console.log("bridge is null, which means not connected");
			//console.log(this);
		}
		console.log("processing system as msg");
		try
		{
			var sys = JSON.parse( message );
			if(sys.type == "connect")
			{
				connectEvent(sys);
				return;
			}
			else
				console.log("not connected and unknown system message type:", sys.type );
		}
		catch (err)
		{
			console.error( "error parsing system message" );
			if(client)
				client.send(JSON.stringify({type:"system",content:"wrong JSON"}));
		}

		if(client)
			client.send(JSON.stringify({type:"system",content:"remote connection not stablished yet"}));
	});

	client.send(JSON.stringify({type:"system",content:"waiting connection..."}));

	client.on('close', function incoming(message) {
		console.log("client leaving:",this.client_id);
		if(interval)
			clearInterval(interval);
		if(timeout)
		{
			clearTimeout(timeout);
			timeout = 0;
		}
		if(this.bridge && this.bridge.readyState === this.bridge.OPEN)
			this.bridge.close();
	});
});

function formatConsoleDate (date) {
	var hour = date.getHours();
	var minutes = date.getMinutes();
	var seconds = date.getSeconds();
	var milliseconds = date.getMilliseconds();

	return '[' +
		   ((hour < 10) ? '0' + hour: hour) +
		   ':' +
		   ((minutes < 10) ? '0' + minutes: minutes) +
		   ':' +
		   ((seconds < 10) ? '0' + seconds: seconds) +
		   '.' +
		   ('00' + milliseconds).slice(-3) +
		   '] ';
}
