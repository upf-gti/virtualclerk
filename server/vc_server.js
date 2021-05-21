var WebSocket = require('ws');
var http = require('http');

var server = http.createServer();

server.listen(9004, function() {
      console.log("Server ready!");

});

var wss = new WebSocket.Server({ server: server }); /*new WebSocketServer({
  httpServer: server,
  autoAcceptConnections: false
});*/
/*var WebSocketServer = require('websocket').server;*/

var clients = [];
/*var socket = new WebSocketServer({
  httpServer: server,
  autoAcceptConnections: false
});*/

var websocket = null;
wss.on('connection', function connection(ws) {

    console.log("User connected")
    websocket = ws;
    var msg = {};
    ws.on('message', function incoming(message) {

        
            console.log('received: %s', message);
            var object_message = JSON.parse(message);
        try{
            switch (object_message.type) 
            {
                //Expected format
                case "message":
                    if(object_message.data)
                    {
                        msg = {
                            type: "info",
                            data: "received: " + object_message.data,
                            time:object_message.time || "no-time"
                        }
                        
                    }
                    else
                        msg={type:"info", data:"none",
                        time:object_message.type}
                    break;
                // 
                case "request_data": msg = { type:"request_data",
                                            time:object_message.time || "no-time"}; 
                                            
                    break;

                case "response_data":
                    if(object_message.data )
                        msg = {
                            type: "response_data",
                            data: object_message.data,
                            time:object_message.time || "no-time"
                        }
                    else
                        msg = {type:"response_data", data:"none",
                        time:object_message.time || "no-time"}
                  
                    break;
                
                case "tab_action":
                    if(object_message.action && object_message.action=="initialize" )
                    {
                        msg = {
                            type:"tab_action", 
                            action: "init_conversation",
                            time:object_message.time || "no-time"
                        } 
                
                    }   
                    break;

                case "app_action": 
                    msg = {
                        type:"app_action",
                        action: "end_conversation",
                        time:object_message.time || "no-time"
                    }
                    
                    break;

                default:
                    msg = {
                        type: "info",
                        data: "Not type found: " + object_message.type,
                        time:object_message.time || "no-time"
                    }
                    
                    break;
            }
            console.log(msg);
            wss.clients.forEach(function each(client) {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify(msg));
                }
              });
            //ws.send(JSON.stringify(msg));
        }
        catch (e) {
            console.log('This doesn\'t look like a valid JSON: ',  message.data);
            return;
        }
	

    });
        

    ws.on("close", function(message) {
        console.log("User disconnected");
        ws.close();
    });
    ws.on('error', function(err) {
        console.log(err);
    });
    // var info = "Message protocol:{type: \"info\", \"ping\", \"msg\" or \"data\" //type of data, data: ... //data message}";
    // ws.send(JSON.stringify({type: "msg", data: "Connection established.\n" + info}))
    // setInterval(function(){
    //   console.log("Ping sended");
    //   ws.send(JSON.stringify({type: "ping"}))
    // }, 5000);
});
