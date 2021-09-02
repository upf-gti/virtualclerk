var PATH_TO_PEOPLE = "data_people.csv";
var PATH_TO_PLACES = "data_places.csv";
var PATH_TO_GROUPS = "data_groups.csv";
var PATH_TO_OFFICES = "data_offices.csv";
var PATH_TO_PHRASES = "data_phrases.csv";

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
                case "get_data": 
                /*Resquest data from DDBB (Google Drive)
                  @type: type of message
                  @data_type: type of data requested ("people", "groups", "places", "offices", "phrases")
                */  var that = this;
                    switch(object_message.data_type){
                      case "people":
                        //fs.createReadStream(PATH_TO_PEOPLE).on("data",function(data){ console.log(data);sendData.bind(that,object_message.data_type)})
                        //fs.readFile(PATH_TO_PEOPLE, sendData.bind(ws,object_message.data_type))
                        fs.readFile(PATH_TO_PEOPLE, 'utf8', function (err, data) {
                          var data = data.replace(/\r?\n/g,"");
                          sendData(ws,object_message.data_type, err, data)})
                          return;
                        break;
                      case "places":
                        fs.readFile(PATH_TO_PLACES)
                        break;
                      case "groups":
                        fs.readFile(PATH_TO_GROUPS)
                        break;
                      case "offices":
                        fs.readFile(PATH_TO_OFFICES)
                        break;
                      case "phrases":
                        fs.readFile(PATH_TO_PHRASES)
                        break;
                    }
                    
                    msg = { type:"request_data",
                            data: object_message.data,
                            time:object_message.time || "no-time"}; 
                                            
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

function sendData(ws, type, err, content)
{
  if (err) return console.log('Error reading '+type+' file:', err);
  console.log(ws)
  console.log(type)
  console.log(err)
  var msg = {
    type: "return_data",
    data_type: type,
    data: content
  }
  if(ws.session){
    if(ws.session.vc_client == ws){
        //BP to tablet
        ws.session.sendToVC(JSON.stringify(msg));
    }else{
        ws.session.sendToTablet(JSON.stringify(msg));
    }
  
  }
}
/*--------------------------------------- GOOGLE DRIVE API ---------------------------------------*/
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
let privatekey = require("./virtual-assistant-privat-key.json");
// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive',
'https://www.googleapis.com/auth/drive.file',
'https://www.googleapis.com/auth/drive.readonly',
'https://www.googleapis.com/auth/drive.metadata.readonly',
'https://www.googleapis.com/auth/drive.appdata',
'https://www.googleapis.com/auth/drive.metadata',
'https://www.googleapis.com/auth/drive.photos.readonly',
'https://www.googleapis.com/auth/drive.activity',
'https://www.googleapis.com/auth/drive.scripts'];

// configure a JWT auth client
let jwtClient = new google.auth.JWT(
  privatekey.client_email,
  null,
  privatekey.private_key,
  SCOPES);
//authenticate request
jwtClient.authorize(function (err, tokens) {
  if (err) {
    console.log(err);
    return;
  } else {
    loadFiles(jwtClient)
    console.log("Successfully connected!");
  }
 });
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
/*const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Drive API.
  authorize(JSON.parse(content), loadFiles);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
/*function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.web;
  console.log(client_secret)
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
/*function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}*/
var people_file_id = "1R7Psnyfxj9qYtE9Qli6JXR3ehj25NTtj";
var places_file_id = "1h3itEf8YwZP2pdDa0gZK-9D1N5E0zcyg";
var groups_file_id = "1ar4j46cg-Ftxix4XZhO-IBepnXkJnMwI";
var offices_file_id = "164KwOTDINi2jO58W2AfPZq4oNpARut8Z";
var phrases_file_id = "1uKkiW4JbF4AZ2F2msvvajMdvZ1jhAgK_";

/**
 * Load all the necessary CSVs data from Drive and write that to local CSVs
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function loadFiles(auth) 
{
  getFile(auth,people_file_id, PATH_TO_PEOPLE);
  getFile(auth,places_file_id, PATH_TO_PLACES);
  getFile(auth,groups_file_id, PATH_TO_GROUPS);
  getFile(auth,offices_file_id, PATH_TO_OFFICES); 
  getFile(auth,phrases_file_id, PATH_TO_PHRASES); 
}
function getFile(auth, fileId, filePath)
{
  const drive = google.drive({version: 'v3', auth});
  var dest = fs.createWriteStream(filePath);
  drive.files.get({
    fileId: fileId,
    mimeType:"text/csv",
    alt:"media"
  }).then(res => {
 
    fs.writeFile(filePath,res.data,function (err,data) {
      if (err) {
        return console.log("Error:"+ err);
      }
      console.log("Data from Google Drive loaded successfuly!");
    });
      
    })
}