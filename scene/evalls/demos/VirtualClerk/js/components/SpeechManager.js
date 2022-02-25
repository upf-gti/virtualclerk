SpeechManager.placeholders = ["{Person name} {Person surname}","{Person name}", "{Person surname}", "{Group name}", "{Building name}", "{Floor name}"]
SpeechManager.cached_audios = [];
var CLIENT_ID = '566335008510-hd8865t1fvvn92gnooo39mg78d88mfhi.apps.googleusercontent.com';
var TOKEN = "ya29.a0AfH6SMCVMXHBqJgqkwoM927NJZijFHjHsiCFnon_XIZ4Bqu07QFLjWo3u21_NJApNytjXp1V1in7IZRbc1_PHqLQXneuXBa3NsNPnKsoVjBEQjqIVW8tHnf5l6G8vwpqLDKVMQnd6bFSOJie2qR-2RbwnvrV";
var SCOPES = ["https://www.googleapis.com/auth/drive.appdata",
"https://www.googleapis.com/auth/drive.file",
"https://www.googleapis.com/auth/drive.install",
"https://www.googleapis.com/auth/drive.apps.readonly",
"https://www.googleapis.com/auth/drive.metadata",
"https://www.googleapis.com/auth/drive",
"https://www.googleapis.com/auth/drive.activity",
"https://www.googleapis.com/auth/drive.activity.readonly",
"https://www.googleapis.com/auth/drive.readonly",
"https://www.googleapis.com/auth/drive.metadata.readonly",
"https://www.googleapis.com/auth/drive.scripts"];
var KEY = "AIzaSyB6a_ZQYNDdnQeOX6HCfHDKVpD58VLJQKA"
function SpeechManager()
{
  this.inputText = "";
  this._lastText = "";
  this.placeholders = {};
  this.phrases = [];
  this.phrasesURL = "";
  this.extraAudios = [];
  this._audioFile = "";
  this._audioArray = [];
  this._currentAudioId = 0;
	this.audiobuffer = null;
  this._audionodes = [];
	this.audionode = null;
  this.is_playing = false;
  this._queue = [];
  this._lipsync = null;
  this.client_id = CLIENT_ID;
  this.fromDrive = false;
  this.token = TOKEN;
}

SpeechManager.prototype.onConnectionsChange = LGAudio.onConnectionsChange;
SpeechManager.prototype.onBufferCreated = null;
SpeechManager.prototype.onAddedToScene = function(scene)
{
	LEvent.bind(scene, "update", this.onUpdate, this );
  LEvent.bind(scene, "start", this.onStart, this );
}
SpeechManager.prototype.onRemovedFromScene = function(scene)
{
  LEvent.unbind(scene, "update", this.onUpdate, this );
  LEvent.unbind(scene, "start", this.onStart, this );
}
SpeechManager.prototype.onStart = function()
{
  if(!gapi.auth2)
    gapi.load("auth2", this.startGoogleAPI.bind(this));
  else if ( !gapi.auth2.getAuthInstance())
    this.startGoogleAPI();
  //this.reloadAll()
  
}
SpeechManager.prototype.startGoogleAPI = function() {
  
  gapi.auth2.init({  client_id: this.client_id, scope: SCOPES.join(' ')})
  .then(function(){
    
    if(!gapi.auth2.getAuthInstance().isSignedIn.get())
      gapi.auth2.getAuthInstance().signIn();
    var user = gapi.auth2.getAuthInstance().currentUser.get();
    var oauthToken = null;
    if(user.getAuthResponse() && user.getAuthResponse().access_token)
      oauthToken = user.getAuthResponse().access_token;
    else if(user.qc)
  		oauthToken = user.qc.access_token;
    else if(user.mc)
      oauthToken = user.mc.access_token;
    else{
      for(var i in user)
      {
        if(i=="access_token")
          oauthToken = user[i];
        if(user[i].access_token!=undefined)
          oauthToken = user[i].access_token;
      }
      if(!oauthToken)
      {
        console.error("Access token not found")
        return;
      }
    }
   var xhr = new XMLHttpRequest();
   
    var url = 'https://www.googleapis.com/drive/v3/files/'
    xhr.open('GET', url);
    xhr.setRequestHeader('Authorization',
    'Bearer ' + oauthToken);

   xhr.send(); 
		this.reloadAll();
    }.bind(this),function(){
      console.log("Error authenicate google client")
    })
}
SpeechManager.prototype.reloadAll = function()
{
  this.getData(this.phrasesURL,true, "phrases");
  for(var i in this.placeholders)
  {
    var data = this.placeholders[i];
		if(!data.data && data.url)
      this.getData(data.url,true,i);
  }
}
SpeechManager.prototype.newPhrase = function(phrase){
  this._queue.push(phrase)
}
SpeechManager.prototype.onUpdate = function(dt)
{
  
  if(this.inputText != "" )//this.inputText != this._lastText &&)
  {
    this.newPhrase = true; 
    this._queue.push(this.inputText);
    this.inputText = "";
  }
 for(var i = 0; i<this._queue.length; i++)
 {
   var inputText = this._queue[i];
   this._lastText = inputText;
		//this.newPhrase = false;
    //Start new sentence  
    this.parseText(inputText);
    this.playCurrentAudio();
 }
  
  /*if(this.inputText && this.newPhrase)
  {
    /*if(this.audionode && this.audionode.started)
    {
      this.audionode.started = false;
      this.audionode.stop();
      this._audionodes = [];
      
    };
    this._currentAudioId = 0;
    this._audioArray = [];*/
 /*   this._lastText = this.inputText;
		this.newPhrase = false;
    //Start new sentence  
    this.parseText(this.inputText);
    this.playCurrentAudio();
  }*/

  
}
SpeechManager.prototype.transposeData = function(data)
{
    return data[0].map(function (_, c) { return data.map(function (r) { return r[c]; }); });
 /* var phrasesIdx = data[0].indexOf("Phrases");
  var URLIdx = data[0].indexOf("URL");
  var placeholdersIdx = data[0].indexOf("Placeholders");
  
  var phrases = []//data[1];
  var audios = []//data[2];
  
  var placeholders = []//data[3];
  var audioFile = "";
  for(var i = 0; i<data.length; i++)
  {
    phrases.push(data[i][phrasesIdx]);
    audios.push(data[i][URLIdx]);
    placeholders.push(data[i][placeholdersIdx]);
  }
  return [phrases, audios, placeholders] ;*/
}
SpeechManager.prototype.parseText = function(inputText)
{
  var data = this.phrases;
	if(!data.length)
  {
    console.warn("No data")
    return;
  }
  /*var phrasesIdx = data[0].indexOf("Phrases");
  var URLIdx = data[0].indexOf("URL");
  var placeholdersIdx = data[0].indexOf("Placeholders");*/
  
  var phrases = data[0];
  var audios = data[1];
  
  var placeholders = data[2];
  var audioFile = "";
 /* for(var i = 0; i<data.length; i++)
  {
    phrases.push(data[i][phrasesIdx]);
    audios.push(data[i][URLIdx]);
    placeholders.push(data[i][placeholdersIdx]);
  }*/
  //this._audioArray = [];
 // inputText = inputText.replace(/[.,*+\-?^$()|[\]\\]/g, "");
  var id = phrases.indexOf(inputText);
  if(id>0)
  {
    if(audios[id])
    {
      this._queue.shift()
      audios = audios[id].split(",");
    
      for(var i in audios)
      {
        audioFile = audios[i];
        if(audioFile)
        {
          //audioArray.push({url : audioFile})
          this._audioArray.push(audioFile)              
          var on_complete = null;
          if(this._lipsync && this._audioArray[0]==audioFile)
            on_complete = function (){ if(this._lipsync) this._lipsync.loadSample(audioFile)} 
          
          this.loadSound(audioFile, on_complete)
          
        }
      }
    }
  }
  else
  {
    for(var i in phrases)
    {
      var audioIdx = 0;
      var match = (phrases[i] == inputText)? [inputText]:false ;
      /* if(!match)
       {
        var phrase = new RegExp(phrases[i]);
        var	match = phrase.exec(inputText);
       }*/
      /*if(!match)
      {
        match = (phrases[i] == inputText)? [inputText]:false ;	    
      }*/

      if(match)
      {
        this._queue.shift()
        if(placeholders[i]==undefined)
            debugger;
        var phArray = placeholders[i].split(",");
        if(audios[i]==undefined)
            debugger;
        audios = audios[i].split(",");
        var phIdx = 1;
        for(var j=0; j<phArray.length; j++)
        {

          var placeholderValue = match[phIdx];
          if(phArray[j] == "phrase" || phArray[j] =="")
          {
            audioFile = audios[audioIdx];
            if(audioFile)
            {
              //audioArray.push({url : audioFile})
              this.loadSound(audioFile)
              this._audioArray.push(audioFile)              
            }
            audioIdx++;
          }
          else //placeholders
          {
            //compare if a placeholder has more than one word
            var x = j;
            while(x+1<phArray.length && phArray[x] == phArray[x+1])
            {
              phArray.splice(x+1, 1);
              placeholderValue+= " "+match[phIdx+1];
              match.splice(phIdx+1,1);

            }

            audioFile = this.getPlaceholderAudio(phArray[j], placeholderValue);
            if(audioFile)
            {
              this.loadSound(audioFile)
              this._audioArray.push(audioFile)                
            }
            phIdx++;
          }

        }
        return this._audioArray;
      }
   
  	}
    if(!match)
    {
      for(var i in phrases)
      {
        var audioIdx = 0;
        
          var phrase = new RegExp(phrases[i]);
          var	match = phrase.exec(inputText);
         
        /*if(!match)
        {
          match = (phrases[i] == inputText)? [inputText]:false ;	    
        }*/

        if(match && match[0] != "")
        {
          this._queue.shift()
          if(placeholders[i]==undefined)
              debugger;
          var phArray = placeholders[i].split(",");
          if(audios[i]==undefined)
              debugger;
          audios = audios[i].split(",");
          var phIdx = 1;
          for(var j=0; j<phArray.length; j++)
          {

            var placeholderValue = match[phIdx];
            if(phArray[j] == "phrase" || phArray[j] =="")
            {
              audioFile = audios[audioIdx];
              if(audioFile)
              {
                //audioArray.push({url : audioFile})
                this.loadSound(audioFile)
                this._audioArray.push(audioFile)              
              }
              audioIdx++;
            }
            else //placeholders
            {
              //compare if a placeholder has more than one word
              var x = j;
              while(x+1<phArray.length && phArray[x] == phArray[x+1])
              {
                phArray.splice(x+1, 1);
                placeholderValue+= " "+match[phIdx+1];
                match.splice(phIdx+1,1);

              }
             /* if(phArray[x]=="person_name"&&phArray[x+1]=="person_surname")
               {
                 phArray[x] +=","+phArray[x+1];
                 placeholderValue+=", "+match[phIdx+1];
                 j++;
                 phIdx++;
               }*/
              audioFile = this.getPlaceholderAudio(phArray[x], placeholderValue);
              if(audioFile)
              {
                this.loadSound(audioFile)
                this._audioArray.push(audioFile)                
              }
              phIdx++;
            }

          }
          return this._audioArray;
        }
   
  		}
    }
  }
  return this._audioArray;
}

SpeechManager.prototype.getPlaceholderAudio = function(type, value)
{

  var placeholder = this.placeholders[type];
  if(!placeholder)
  {
    console.warn("Placeholder data not found: "+type)
    return;
  }
	var audioRow = placeholder.audio_row;
 	var textRow = placeholder.ph_row;
  var indexs = textRow.split(",")
  var pos = -1;
  for(var i in indexs)
  {
    if(type.includes(indexs[i].toLowerCase()))
    {
      pos = i;
      continue;
    }
    
  }
  
	var url = placeholder.url;
  
  for(var i in placeholder.data)
  {
    if(placeholder.data[i][0].toLowerCase() == audioRow.toLowerCase())
      	audioRow = i;
    
    if(typeof textRow == "string" && placeholder.data[i][0].toLowerCase() == textRow.toLowerCase())
      textRow = [i,pos];
      
  }
  
 /* if(!this.placeholders[type].data.length && url)
  {
    var extension = url.split(/[#?]/)[0].split('.').pop().trim();
		if(extension != "mp3" && extension != "wav")
      url+=value+".mp3";
    this.placeholders[type].data = this.getData( this.placeholders[type].url, true);

  }*/
  
  var audios = placeholder.data[audioRow];
  var text = placeholder.data[textRow[0]]
  
  for(var i=0; i<text.length; i++)
  {
    var data = text[i].normalize("NFD");
    data = data.replace(", "," ");
    data = data.split(",")
    value = value.normalize("NFD").toUpperCase();

    if(data[textRow[1]].toUpperCase().includes(value))
    {
      var audio = audios[i].split(",");
      audio = audio[textRow[1]];
      
	    if(audio == undefined || audio =="" || audio.split(/[#?]/)[0]==undefined)
    	    return;
      var extension = audio.split(/[#?]/)[0].split('.').pop().trim();
        
      //first position of the array must be the "stardard" name
      
      if(extension != "mp3" && extension != "wav" && !audio.includes("google"))	
        audio+=value+".mp3";

      return audio;

    }
    
  }
  return;
}

SpeechManager.prototype.playCurrentAudio = function()
{

  var audioArray = this._audioArray;
  if(!audioArray.length)
    return;
  if(this._lipsync)
    this._lipsync.loadSample(audioArray[this._currentAudioId]);
  else
		this._request = this.loadSound(audioArray[this._currentAudioId], inner.bind(this));
  
    function inner(buffer) 
    {
      var that = this;
      
      that.audiobuffer = buffer;
      that.playBuffer(that.audiobuffer)
      if(that.onBufferCreated)
      {
        that.onBufferCreated(buffer);
      }
     
    }
  //this.playBuffer(this._audioArray[this._currentAudioId]);
  if(this._currentAudioId < this._audioArray.length)
  {
    this._currentAudioId++;
    this.is_playing = true;
  }
  else
  {
    this._currentAudioId = 0;
    this._audioArray = [];
    if(this.audionode && this.audionode.started)
    {
      this.audionode.started = false;
      this.audionode.stop();
      this._audionodes = [];
      this._lastText = "";
      
      
    };
    this._currentAudioId = 0;
    this._audioArray = [];
    this._lastText = this.inputText;
    this.inputText = "";
		this.newPhrase = false;
    
  }
}

SpeechManager.prototype.getData = function( name, force_load, output )
{
	if(name=== undefined) 
  { console.warn("Undefined filname")
  	return [];
  }

	
	var data = ONE.ResourcesManager.getResource( name );
	if(!data || force_load)
  {
    delete ONE.ResourcesManager.resources[name]
    if(name.includes("google") &&this.fromDrive &&this.client_id!="")
    {
      var fileId = name.split("/")[5]
      getDriveFile(fileId, "text/csv", function(output, response){
        var data = CSVToArray(response, ";");
        if(output !="phrases")
          this.placeholders[output].data = this.transposeData(data)
        else
        	this[output] = this.transposeData(data)
        ONE.ResourcesManager[name] = {data: response}
        
      }.bind(this, output))
      
      //var url = 'https://www.googleapis.com/drive/v3/files/'+fileId'/export?mimeType='+encodeURI(mimeType);
    }
    else{
      ONE.ResourcesManager.load( name, {}, function(v){
        data = v;
      
        console.log(name+" loaded")
        this[output] = CSVToArray(data.data, ";");
     
      }, true, function(v){ debugger;console.error(v)} );
      
    if(data && data.data)
    {
      var data = CSVToArray(data.data, ";")
      this[output] =  this.transposeData(data)
    }
  }
}
}
function getDriveFile(fileId, mimeType, callback) {
  if(!gapi.auth2.getAuthInstance().isSignedIn.get())
    gapi.auth2.getAuthInstance().signIn().then(getDriveFile(fileId, mimeType, callback))
  var user = gapi.auth2.getAuthInstance().currentUser.get();
  var oauthToken = null;
  if(user.getAuthResponse() && user.getAuthResponse().access_token)
      oauthToken = user.getAuthResponse().access_token;
  else if(user.qc)
    oauthToken = user.qc.access_token;
  else if(user.mc)
    oauthToken = user.mc.access_token;
  else{
    for(var i in user)
    {
      if(i=="access_token")
        oauthToken = user[i];
      if(user[i].access_token!=undefined)
        oauthToken = user[i].access_token;
    }
    if(!oauthToken)
    {
      console.error("Access token not found")
      return;
    }
  }
    
    
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function()
  {
      if (xhr.readyState == 4 && xhr.status == 200)
      {
      	if(callback)
        	callback(xhr.response)
        if(xhr.responseText)
          console.log(xhr.responseText); // Another callback here
      }
      else
          console.log(xhr)
  }; 
  var url = 'https://www.googleapis.com/drive/v3/files/'+fileId;
  url+='?alt=media'; 

  url+= '&key='+ KEY;
  if(mimeType=="audio")
  {
    url+="&v=.mp3"
    xhr.responseType = "arraybuffer";
  }
  xhr.open('GET', url);
  xhr.setRequestHeader('Authorization',
  'Bearer ' + oauthToken);
  
  xhr.send(); 
  
}
SpeechManager.prototype.loadSound = function(url, on_complete, on_error) {
 // url = encodeURIComponent(url)
  if(!url || url=="")
    return;
  if (LGAudio.cached_audios[url] && url.indexOf("blob:") == -1) {
    if (on_complete) {
      on_complete(LGAudio.cached_audios[url]);
    }
		return SpeechManager.cached_audios[url];
  }

  if (SpeechManager.onProcessAudioURL) {
    url = SpeechManager.onProcessAudioURL(url);
  }

  //load new sample
  var request = new XMLHttpRequest();
  if(url.includes("google"))
  {
    if(!gapi.auth2)
    {
      gapi.load("auth2", this.startGoogleAPI.bind(this))
    }
    var user = gapi.auth2.getAuthInstance().currentUser.get();
    var oauthToken = null;
    if(user.getAuthResponse() && user.getAuthResponse().access_token)
      oauthToken = user.getAuthResponse().access_token;
    else if(user.qc)
      oauthToken = user.qc.access_token;
    else if(user.mc)
      oauthToken = user.mc.access_token;
    else{
      for(var i in user)
      {
        if(user[i])
        {
          if(i=="access_token")
            oauthToken = user[i];
            
          else if(user[i].access_token!=undefined)
            oauthToken = user[i].access_token;
        }
      }
      if(!oauthToken)
      {
        console.error("Access token not found")
        this.startGoogleAPI()
        return;
      }
    }
    var fileId = url.split("/")[5];
    var newUrl = 'https://www.googleapis.com/drive/v3/files/'+fileId+'?alt=media'+
        '&key='+KEY+"&v=.mp3";
    request.open("GET", newUrl, true);
    request.setRequestHeader('Authorization',
    'Bearer ' + oauthToken);
    request.responseType = "arraybuffer";
  }
  else{
    
    request.open("GET", url, true);
    request.responseType = "arraybuffer";
  }

  var context = LGAudio.getAudioContext();

  // Decode asynchronously
  request.onload = function() {
    console.log("AudioSource loaded");
    return context.decodeAudioData(
      request.response,
       function(buffer) {
        console.log("AudioSource decoded");
        LGAudio.cached_audios[url] = buffer;
        if (on_complete) {
          on_complete(buffer);
        }
        return buffer;
      },
      onError
    );
  };
  request.send();

  function onError(err) {
    console.log("Audio loading sample error:", err);
    if (on_error) {
      on_error(err);
    }
  }

  return request;
};

SpeechManager.prototype.playBuffer = function(buffer) {
  var that = this;
  var context = LGAudio.getAudioContext();

  //create a new audionode (this is mandatory, AudioAPI doesnt like to reuse old ones)
  this.audionode = context.createBufferSource(); //create a AudioBufferSourceNode
  this._last_sourcenode = this.audionode;
  this.audionode.graphnode = this;
  this.audionode.buffer = buffer;
  this.audionode.playbackRate.value = 1;
  this._audionodes.push(this.audionode);
 
 
  this.audionode.onended = function() {
    //console.log("ended!");
    //that.trigger("ended");
    that.playCurrentAudio()
    var index = that._audionodes.indexOf(that.audionode);
    if (index != -1) {
      that._audionodes.splice(index, 1);
    }
    else{
    	that.is_playing = false;
    }
  };

  if (!this.audionode.started) {
    
    this.audionode.started = true;
    this.audionode.start();
  }
  return this.audionode;
};


// EDITOR STUFF ******************************************************
SpeechManager["@inspector"] = function( component, inspector )
{
	inspector.widgets_per_row = 1;
  inspector.addString("Input text", component.inputText, {callback: function(v){
  	component.inputText = v;
    component.newPhrase = true; 
    
  }})
 // inspector.addInfo("Only .csv supported");
  inspector.widgets_per_row = 3;
  /*if(!component.phrases.length && component.phrasesURL)
      component.phrases = component.getData(component.phrasesURL,false)*/
  inspector.addResource("Phrases", component.phrasesURL,{width: "calc(100% - 40px)", callback: function(v){
  	component.phrasesURL = v;
    component.getData(v,true, "phrases");
    
    
    //inspector.refresh();
  }});
  inspector.addButton(null, '<img src="imgs/mini-icon-rotator.png">' ,{width:40,callback: function(v){
  	component.getData(component.phrasesURL,true, "phrases");
    
    inspector.refresh();
  }})
  inspector.addCheckbox("From dirve", component.fromDrive, {callback: function(v){
    component.fromDrive = v;
    inspector.refresh();
  }} )
  if(component.fromDrive)
  {
    inspector.addString("Client ID", component.client_id, {callback: function(v){
      component.client_id = v;
      console.log("cliend id")
      if(v!="")
      {
        debugger;
        gapi.load('auth2', component.startGoogleAPI.bind(component))
      }
      
    }})
  }
 	inspector.addTitle("Placeholders");
  
  for(var i in component.placeholders)
  {
    var data = component.placeholders[i];
		if(!data.data && data.url)
      component.getData(data.url,true, i);
    inspector.addResource(i, data.url,{width: "calc(100% - 80px)", callback: function(v){
      var id = this.toString();
      component.placeholders[id].url = v;
      component.getData(v,true,id);
      inspector.refresh();
  	}.bind(i)});
    inspector.addButton(null, '<img src="imgs/mini-icon-rotator.png">' ,{ id:i,width:40,callback: function(v){
			var id = this.toString();
      component.getData(component.placeholders[id].url,true,id);
      inspector.refresh();
    }.bind(i)})	
    inspector.addButton(null, '<img src="imgs/mini-icon-trash.png">' ,{width:40,callback: function(v){
      delete component.placeholders[data.id];
      inspector.refresh();
    }})
  }
  
  /*
  //PEOPLE
  inspector.addResource("People", component.peopleFile,{width: "calc(100% - 40px)", callback: function(v){
  	component.peopleFile = v;
    component.peopleData = component.getData(v,false);
  }});
  inspector.addButton(null, '<img src="imgs/mini-icon-rotator.png">' ,{width:40,callback: function(v){
  	component.peopleData = component.getData(component.peopleFile,true);
  }})
  //GROUPS
  inspector.addResource("Groups", component.groupsFile,{width: "calc(100% - 40px)", callback: function(v){
  	component.groupsFile = v;
    component.groupsData = component.getData(v,false);
  }});
  inspector.addButton(null, '<img src="imgs/mini-icon-rotator.png">' ,{width:40,callback: function(v){
  	component.groupsData = component.getData(component.groupsFile,true);
  }})
  //OFFICES
  inspector.addResource("Offices", component.officesFile,{width: "calc(100% - 40px)", callback: function(v){
  	component.officesFile = v;
    component.officesData = component.getData(v,false);
  }});
  inspector.addButton(null, '<img src="imgs/mini-icon-rotator.png">' ,{width:40,callback: function(v){
  	component.officesData = component.getData(component.officesFile,true);
  }});*/
  inspector.widgets_per_row = 1;
  inspector.addSeparator();
  inspector.addTitle("New placeholder");
  
  var newPlaceholder = {
    id: "",
    url:"",
    ph_row:"",
    audio_row:"URL"
  };
  inspector.addString("Id",newPlaceholder.id, {callback: function(v){
  	newPlaceholder.id = v
  }});
    inspector.addResource("File", newPlaceholder.url,{ callback: function(v){
  	newPlaceholder.url =  v;
    
  }});
  inspector.addString("Placeholder row",newPlaceholder.ph_row0, {callback: function(v){
  	newPlaceholder.ph_row = v
  }});
  inspector.addString("Audio row",newPlaceholder.audio_row, {callback: function(v){
  	newPlaceholder.audio_row = v
  }});

  inspector.widgets_per_row = 2;
  inspector.addButton(null,"Add", {callback: function(v){
  	component.placeholders[newPlaceholder.id] = newPlaceholder;
    component.getData(v,true,newPlaceholder.id);
    inspector.refresh();
  }});
  inspector.addButton(null,"Clear", {callback: function(v){
    newPlaceholder = {};
  }})
}

LS.registerComponent(SpeechManager);


function AudioNodesConnection()
{
  this.addInput("audionode", "audio");
  this.addOutput("out","audio");
  
  
}
AudioNodesConnection.prototype.onExecute = function()
{
  var node = this.getInputData(0);
  if(!node) return;
  this.audionode = node;

  var links = this.outputs[0].links;
  for(var i in links)
  {
  	var link = links[i]
    if(link!=undefined)
      this.connectOutputs(link)
  }
  
 
}
AudioNodesConnection.prototype.connectOutputs = function(link)
{
  
	var target_node = null;
  var id = this.graph.links[link].target_id;
  target_node = this.graph.getNodeById(id);
  
  //get target audionode
  var target_audionode = null;
  if (target_node.getAudioNodeInInputSlot) {
    target_audionode = target_node.getAudioNodeInInputSlot(
      link
    );
  } else {
    target_audionode = target_node.audionode;
  }
  this.audionode.connect(target_audionode); 
}
//Helps connect/disconnect AudioNodes when new connections are made in the node
AudioNodesConnection.prototype.onConnectionsChange = LGAudio.onConnectionsChange;
LiteGraph.registerNodeType("audio/connection", AudioNodesConnection);


function CSVToArray( strData, strDelimiter ){
  // Check to see if the delimiter is defined. If not,
  // then default to comma.
  strDelimiter = (strDelimiter || ",");

  // Create a regular expression to parse the CSV values.
  var objPattern = new RegExp(
    (
      // Delimiters.
      "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

      // Quoted fields.
      "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

      // Standard fields.
      "([^\"\\" + strDelimiter + "\\r\\n]*))"
    ),
    "gi"
  );


  // Create an array to hold our data. Give the array
  // a default empty first row.
  var arrData = [[]];

  // Create an array to hold our individual pattern
  // matching groups.
  var arrMatches = null;


  // Keep looping over the regular expression matches
  // until we can no longer find a match.
  while (arrMatches = objPattern.exec( strData )){

    // Get the delimiter that was found.
    var strMatchedDelimiter = arrMatches[ 1 ];

    // Check to see if the given delimiter has a length
    // (is not the start of string) and if it matches
    // field delimiter. If id does not, then we know
    // that this delimiter is a row delimiter.
    if (
      strMatchedDelimiter.length &&
      strMatchedDelimiter !== strDelimiter
    ){

      // Since we have reached a new row of data,
      // add an empty row to our data array.
      arrData.push( [] );

    }

    var strMatchedValue;

    // Now that we have our delimiter out of the way,
    // let's check to see which kind of value we
    // captured (quoted or unquoted).
    if (arrMatches[ 2 ]){

      // We found a quoted value. When we capture
      // this value, unescape any double quotes.
      strMatchedValue = arrMatches[ 2 ].replace(
        new RegExp( "\"\"", "g" ),
        "\""
      );

    } else {

      // We found a non-quoted value.
      strMatchedValue = arrMatches[ 3 ];

    }


    // Now that we have our value string, let's add
    // it to the data array.
    arrData[ arrData.length - 1 ].push( strMatchedValue );
  }

  // Return the parsed data.
  return( arrData );
}