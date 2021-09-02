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
var sessions = {};
/*
To connect to session send a message like:
{
  type: "session",
  data: {
    token: "",
    action: "" <- "vc_connection" assumes client is vc_client,
                  "tablet_connection" assumes client is tablet_client,
                 
  }
}
*/
function Session(token){
  this.token = token;
  this.vc_client = null; //ws client running the Virtual Clerk
  this.tablet_client = null;       //ws tablet client
  //vc_client.session = this;
  
}

Session.prototype.connect = function(tablet_client, type){
  if(tablet_client.session == this){
    sendInfo(tablet_client, "Warn: already connected to this session.");
  }else{
    if(tablet_client.session){
      //In another session
      tablet_client.session.disconnect(tablet_client);
    }
    tablet_client.session = this;
    
    if(type == "vc_connection")
    {
        if(this.vc_client !=null)
        {
            sendInfo(tablet_client, "Error: there is already a VC connected to a session with this token '" + this.token + ".");
            return;
        }else
            this.vc_client = tablet_client;
    }
    else if( type == "tablet_connection")
    {
        if(this.tablet_client !=null)
        {
            sendInfo(tablet_client, "Error: there is already a tablet connected to a session with this token '" + this.token + ".");
            return;
        }else
            this.tablet_client = tablet_client;
    }
    tablet_client.session = this;
    sendInfo(tablet_client, "Info: connected to session with token '" + this.token + ".");
  }
}

Session.prototype.disconnect = function(client){
  client.session = null;
  if(client == this.vc_client){
    this.vc_client = null;
    
  }else if (client == this.tablet_client){
    this.tablet_client = null;
  }
  if(this.tablet_client == null && this.vc_client == null)
    removeSession(this, "Info: session has been terminated because both vc and tablet client have disconnected.");
  sendInfo(client, "Info: succesfully disconnected from session '" + this.token + "'.");
}

Session.prototype.sendToVC = function(message){
  if(this.vc_client) this.vc_client.send(message);
  console.log("Sended to VC:" + message)
}

Session.prototype.sendToTablet = function(message){
  if(this.tablet_client) this.tablet_client.send(message);
  console.log("Sended to Tablet:" + message)
}

function removeSession(session, msg){
  if(sessions[session.token]){
    delete sessions[session.token];

    //Session should only be removed when bp_client has disconnected, but for precaution
    if(session.vc_client){
      sendInfo(session.vc_client, msg);
      session.vc_client.session = null;
    }

    if(session.tablet_client){
        sendInfo(session.tablet_client, msg);
        session.tablet_client.session = null;
    }   
  }
}

var websocket = null;
wss.on('connection', function connection(ws) {

    console.log("User connected")
    clients.push(ws);
    websocket = ws;
    var msg = {};
    ws.on('message', function incoming(message) {

        
        console.log('received: %s', message);
        var object_message = null;
        try{
          object_message = JSON.parse(message);
        }catch{
          //Not a JSON, return a warn
          sendInfo(ws, "Warn: the message is not a JSON, ignoring it.");
          return;
        }
  
       
        var object_message = JSON.parse(message);
        
        //try{
            switch (object_message.type) 
            {
                
                //Expected format
                case "session":
                    var token = object_message.data.token;
                    var action = object_message.data.action;

                    var session = sessions[token];

                    
                    if(session){
                        session.connect(ws, action); // action can be "vc_connection" or "tablet_connection"
                        //sendInfo(ws, "Warn: there is already a session with this token.");
                    }else{
                      //If in another session disconnect. Inside disconnect if client was bp that session will be removed.
                      if(ws.session)
                        ws.session.disconnect(ws);
                              
                      //Create a session
                      sessions[token] = new Session(token);
                      
                      sessions[token].connect(ws, action);
                     // ws.session = sessions[token]
                   
                      sendInfo(ws, "Info: session with token '" + token + "' created.");
                    }
                    
                    return;
                
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
                
                case "request_data": 
                /*Resquest data to the tablet (person, group, place)
                  @type: type of message
                  @data: type of data requested ("person", "group", "place")
                */
                    msg = { type:"request_data",
                            data: object_message.data,
                            time:object_message.time || "no-time"}; 
                                            
                    break;

                case "response_data":
                /*Send data requested from tablet to app (person, group, place)
                  @type: type of message
                  @data: data requested (person name & surname, group name, place name)
                */
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
                /*User carried out some action thorught the tablet
                  @type: type of message
                  @action: type of action ("init_conversation")
                */
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
                        action: object_message.action || "end_conversation",
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
            /*clients.forEach(function each(client) {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify(msg));
                }
              });*/
            console.log(ws.session)
            if(ws.session){
                if(ws.session.vc_client == ws){
                    //BP to tablet
                    ws.session.sendToTablet(JSON.stringify(msg));
                }else{
                    ws.session.sendToVC(JSON.stringify(msg));
                }
               /* ws.session.sendToTablet(JSON.stringify(msg));
                ws.session.sendToVC(JSON.stringify(msg));*/
            }
            //ws.send(JSON.stringify(msg));
        /*}
        catch(e) {
            console.log('This doesn\'t look like a valid JSON: ',  object_message);
            return;
        }*/
	

    });
        

    ws.on("close", function(message) {
        var index = clients.indexOf(ws);
        clients.splice(index, 1);
        
        //Remove from session
        if(ws.session){
          ws.session.disconnect(ws);
        }
        console.log("User disconnected");
        ws.close();
    });
    ws.on('error', function(err) {
        console.log(err);
    });
   
});
function sendInfo(ws, msg){
  console.log(msg)
    ws.send(JSON.stringify({type: "info", data: msg}));
  }