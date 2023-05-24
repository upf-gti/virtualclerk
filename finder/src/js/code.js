var PERSON_TYPE = true;
var GROUP_TYPE  = false;
var BUILDING_TYPE  = false;

var data_ready = false;

var person_names_list = [];
var person_surnames_list = [];
var groups_list = [];
var buildings_list = [];
var current_data_source = person_names_list;

var muted = true;
var speaking = false;
var ws = null;

initApp();

function initApp () 
{
    window.current_searchtype = PERSON_TYPE;
    window.current_input = '';
    window.start = false;
    ws = init_websocket();
    muted = true;
    setEvents();
    
}

function capitalizeFirstLetter(string) 
{
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function capitalize(s) {
    let first_char = /\S/;
    return s.replace(first_char, function(m) { return m.toUpperCase(); });
}

function titleCase(str) 
{
    var splitStr = str.toLowerCase().split(' ');
    for (var i = 0; i < splitStr.length; i++) {
        // You do not need to check if i is larger than splitStr length, as your for does that for you
        // Assign it back to the array
        splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);     
    }
    // Directly return the joined string
    return splitStr.join(' '); 
}  

function requestData(){
    /*PEOPLE DATA*/
    var msg = {
        type: "get_data",
        data_type: "people"
    }
    ws.send(JSON.stringify(msg));
    /*GROUPS DATA*/
    var msg = {
        type: "get_data",
        data_type: "groups"
    }
    ws.send(JSON.stringify(msg));
    /*PLACES DATA*/
    var msg = {
        type: "get_data",
        data_type: "places"
    }
    ws.send(JSON.stringify(msg));
}


function loadData (data_type, data)
{
    var data = CSVToArray(data, ";");
    data = data[0].slice(1);
        
    switch(data_type){
        /*PEOPLE DATA*/
        case "people":
            getHTMLRequest("people", {"key": "names"}, "", function(data){
                /* for(var i=0; i<data.length; i++)
                {
                    var data_arr = data[i].split(", ");
                    for(var j=0; j<data_arr.length; j++)
                        data_arr[j] = capitalizeFirstLetter(data_arr[j].toLowerCase());
                    var person = data_arr.join(" ");
                    person_names_list.push(person);
                } */
                data = JSON.parse(data);
                for(var i=0; i<data.length; i++)
                {
                    var name = titleCase(data[i].name.toLowerCase())
                    person_names_list.push(name);
                }
                updateListDB();
            }, function(err){console.log(err)}, true)
            
            break;
        /*GROUPS DATA*/
        case "groups":
            for(var i=0; i<data.length; i++)
            {
                var group = data[0];
                groups_list.push(group);   
            }
            updateListDB();
            break;
        /*BUILDINGS DATA*/
        case "places":
            for(var i=0; i<data.length; i++)
            {
                var building = data[0];
                buildings_list.push(building);          
            }
            updateListDB();
            break;
    }
}


function setEvents() 
{
    autocomplete(document.getElementById("myInput"), current_data_source);

    /** PEOPLE SEARCH */
    var personToggle = document.getElementById("person-toggle")
    if(personToggle)
    {
      personToggle.addEventListener("click", function() {
          var active_filters = document.getElementsByClassName('active');


          if(this.classList.contains("active"))
          {
              updateListDB()
              return;
          }
          else
          {
              var actives = document.getElementsByClassName("active");
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
    }

    /** GROUP SEARCH */
    var groupToggle = document.getElementById("group-toggle");
    if(groupToggle)
    {
      groupToggle.addEventListener("click", function() {
          var active_filters = document.getElementsByClassName('active');


          if(this.classList.contains("active"))
          {
              updateListDB()
              return;
          }
          else
          {
              var actives = document.getElementsByClassName("active");
              for(var i = 0; i< actives.length; i++)
                  actives[i].classList.remove("active");

              this.classList.add("active");
              BUILDING_TYPE = false
              PERSON_TYPE = false
              GROUP_TYPE = true
          }

          updateListDB()

      });
    }

    /** BUILDING SEARCH */
    var buildingToggle = document.getElementById("building-toggle");
    if(buildingToggle)
    {
        buildingToggle.addEventListener("click", function() {
            var active_filters = document.getElementsByClassName('active');

            if(this.classList.contains("active"))
            {
                updateListDB()
                return;

            }
            else
            {

                var actives = document.getElementsByClassName("active");
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
    }

    document.getElementById("send-btn").addEventListener("click", function() {
        var input = document.getElementById("myInput").value;
        if(!input){

            alert('You have to write and select something')
            return;
        }
        window.current_input = input;
        document.getElementById("myInput").value = "";
        var cnt = document.getElementById("buttons-container");
        cnt.style.display ='block'; 
        // send input to the server
        var response_message = {type:"response_data", data:input}
        ws.send(JSON.stringify(response_message));
        changeWaitingView()
       
    });

    document.getElementById("mute-btn").addEventListener("click", function() 
    {
        // mute = !mute;
        var btn = document.getElementById("mute-btn");
        var micro = document.getElementById("speech-btn");
        if(btn.classList.contains("active"))
        {
            btn.classList.remove("active");
            micro.classList.add("anim");
        }
        else
        {
            btn.classList.add("active");
            micro.classList.remove("anim");
        }

        var init_message = {type:"tab_action", action:"mute", time:timestamp}
        ws.send(JSON.stringify(init_message));
    });

    document.getElementById("play-btn").addEventListener("click", function() {

        showTermsAndConditions(true);
        
    });


    document.getElementById("skip-container").addEventListener("click", function(){
        dskip_container.style.visibility = "hidden";
        
        //Speech microphone visible
        showSpeechButton(true);
        
        //Send action to server
        var init_message = {type:"tab_action", action:"skip", time:timestamp}
        ws.send(JSON.stringify(init_message));
    });

    document.getElementById("accept-terms").addEventListener("click", function() {
        var age   = document.querySelector("#age").checked;       
        var gapi1 = document.querySelector("#gapi1").checked;
        var gapi2 = document.querySelector("#gapi2").checked;

        if(age && gapi1 && gapi2)
        {
            window.start = true;

            showTermsAndConditions(false);
            showPlayButton(false);
            
            //Speech microphone visible
            muted = true;
            showSpeechButton(true);
            // send start conversation "event" to the server
            if(!connected_to_session) {
                var message = {type: "session", data: {action: "tablet_connection", token: "dev"}};
                ws.send(JSON.stringify(message))
                setTimeout(initConversation, 1000);
                return;
            }
            
            initConversation();
            function initConversation() {

                var init_message = {type:"tab_action", action:"initialize", time:timestamp}
                ws.send(JSON.stringify(init_message));
            }
            
        }
    });

    document.getElementById("cancel-terms").addEventListener("click", function() {
        showTermsAndConditions(false);
    });

    // Just for the moment, to toggle the waiting screen
    document.addEventListener("keypress", function(e){
        if(e.code == "Digit1")
        {
            var div = document.getElementById("waiting-container");
            if(div.style.visibility == "hidden")
            {
                div.style.visibility = "visible";
            }
            else
                div.style.visibility = "hidden";
        }

    });

    //Server session Modal
    var s_modal = document.getElementById("session");
    var s_span = document.getElementById("session-close");
    document.getElementById("btn-session").addEventListener("click", function(){
        
        var s_input = document.getElementById("token");
        if(ws && ws.readyState== WebSocket.OPEN)
        {
            var message = {type: "session", data: {action: "tablet_connection", token: s_input.value}};
            ws.send(JSON.stringify(message))
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
}

function changeWaitingView()
{
    var div = document.getElementById("waiting-container");
    var where = document.getElementById("where-form");
    var speech_btn = document.getElementById("speech-btn");
            
    if(div.style.visibility == "hidden")
    {
        div.style.visibility = "visible";
        where.style.visibility = "hidden";
        speech_btn.style.visibility = "visible";
    }
    else{
        div.style.visibility = "hidden";
        where.style.visibility = "visible";
    }
}

function resetView()
{
  window.start = false;
  document.getElementById("play-btn").classList.remove("w3-gray-color")
  document.getElementById("play-btn").classList.add("w3-red-color")
}

function updateListDB()
{
    temp = []
    if(PERSON_TYPE)
        temp = temp.concat(person_names_list)
    if(GROUP_TYPE)
        temp = temp.concat(groups_list)
    if(BUILDING_TYPE)
        temp = temp.concat(buildings_list)

    current_data_source = temp;
    autocomplete(document.getElementById("myInput"), current_data_source);

}

function autocomplete(inp, arr) 
{
    /*the autocomplete function takes two arguments,
    the text field element and an array of possible autocompleted values:*/
    var currentFocus;
    /*execute a function when someone writes in the text field:*/
    inp.addEventListener("input", function(e) {
        var a, b, i, val = this.value;
        /*close any already open lists of autocompleted values*/
        closeAllLists();
        if (!val) { return false;}
        currentFocus = -1;
        /*create a DIV element that will contain the items (values):*/
        a = document.createElement("DIV");
        a.setAttribute("id", this.id + "autocomplete-list");
        a.setAttribute("class", "autocomplete-items");
        /*append the DIV element as a child of the autocomplete container:*/
        this.parentNode.appendChild(a);
        /*for each item in the array...*/
        for (i = 0; i < arr.length; i++) {
            /*check if the item starts with the same letters as the text field value:*/
            if (arr[i].toUpperCase().includes(val.toUpperCase())) {
            /*create a DIV element for each matching element:*/
            b = document.createElement("DIV");
            /*make the matching letters bold:*/
            b.innerHTML = arr[i].substr(0, val.length);
            b.innerHTML += arr[i].substr(val.length);
            /*insert a input field that will hold the current array item's value:*/
            b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
            /*execute a function when someone clicks on the item value (DIV element):*/
            b.addEventListener("click", function(e) {
                /*insert the value for the autocomplete text field:*/
                inp.value = this.getElementsByTagName("input")[0].value;
                /*close the list of autocompleted values,
                (or any other open lists of autocompleted values:*/
                closeAllLists();
            });
            a.appendChild(b);
            }
        }
    });
    /*execute a function presses a key on the keyboard:*/
    inp.addEventListener("keydown", function(e) {
        var x = document.getElementById(this.id + "autocomplete-list");
        if (x) x = x.getElementsByTagName("div");
        if (e.keyCode == 40) {
            /*If the arrow DOWN key is pressed,
            increase the currentFocus variable:*/
            currentFocus++;
            /*and and make the current item more visible:*/
            addActive(x);
        } else if (e.keyCode == 38) { //up
            /*If the arrow UP key is pressed,
            decrease the currentFocus variable:*/
            currentFocus--;
            /*and and make the current item more visible:*/
            addActive(x);
        } else if (e.keyCode == 13) {
            /*If the ENTER key is pressed, prevent the form from being submitted,*/
            e.preventDefault();
            if (currentFocus > -1) {
            /*and simulate a click on the "active" item:*/
            if (x) x[currentFocus].click();
            }
        }
    });

    function addActive(x) {
        /*a function to classify an item as "active":*/
        if (!x) return false;
        /*start by removing the "active" class on all items:*/
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        /*add class "autocomplete-active":*/
        x[currentFocus].classList.add("autocomplete-active");
    }
    function removeActive(x) {
        /*a function to remove the "active" class from all autocomplete items:*/
        for (var i = 0; i < x.length; i++) {
        x[i].classList.remove("autocomplete-active");
        }
    }
    function closeAllLists(elmnt) {
        /*close all autocomplete lists in the document,
        except the one passed as an argument:*/
        var x = document.getElementsByClassName("autocomplete-items");
        for (var i = 0; i < x.length; i++) {
        if (elmnt != x[i] && elmnt != inp) {
            x[i].parentNode.removeChild(x[i]);
        }
        }
    }
    /*execute a function when someone clicks in the document:*/
    document.addEventListener("click", function (e) {
        closeAllLists(e.target);
    });
}

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
    return arrData[0].map(function (_, c) { return arrData.map(function (r) { return r[c]; }); });
//    return( arrData );
  }

let baseURL = "https://dtic-recepcionist.upf.edu/api";
let xmlHttp = new XMLHttpRequest();
let finalURL, mapIter;

/*
* The get request logic, it works using the baseURL and adding extra parameters
* @method getHTMLRequest
* @params {extraURL} the page to be created 
* @params {keys} the params for the URl, is a json object that contains the keys and values
* @params {body} the body of the request (if needed)
* @params {callback} function to see what to do with the request response
* @params {onlyValue} if no key is nedded and just the value is true 
*/
function getHTMLRequest(extraURL, keys, body, callback, callbackError = function(){}, onlyValue = false) {
  
  xmlHttp.onreadystatechange = function() {
    if (xmlHttp.readyState == XMLHttpRequest.DONE)
      if(xmlHttp.status == 200)
        callback(xmlHttp.responseText);
      else if (xmlHttp.status == 404 || xmlHttp.status == 401)
        callbackError()
  }

  xmlHttp.onerror = function(e) {
   
  };

  //Set the final url
  finalURL = baseURL+"/"+extraURL;

  //Set the keys of the url
  if(keys != undefined) {
    if(!onlyValue)
      Object.entries(keys).map(([k,v]) => finalURL+="/"+k+"/"+v);
    else
      Object.entries(keys).map(([k,v]) => finalURL+="/"+v);
  }

  console.log(finalURL);

  xmlHttp.open("GET", finalURL, true);
  xmlHttp.send((body || null));
}

window.SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
let recognition = new window.SpeechRecognition();
recognition.lang = 'en-US';

// recognition.onspeechstart = () => {
//     animateSpeechButton(true);
// }

// recognition.onspeechend = () => {
//     animateSpeechButton(false);
// }
let final_transcript = "";
recognition.onresult = (event) => {

    let interim_transcript = '';
    if (typeof(event.results) == 'undefined') {
        return;
    }

    for (let i = event.resultIndex; i < event.results.length; ++i) {

      if (event.results[i].isFinal) {

        final_transcript += event.results[i][0].transcript;
        interim_transcript = ""

      } else {
        interim_transcript += event.results[i][0].transcript;
      }
    }
    final_transcript = capitalize(final_transcript);
    
    //send message to the main app 
    let response_message = {type:"response_data", data: final_transcript}
    ws.send(JSON.stringify(response_message));

    animateSpeechButton(false);
    final_transcript = "";
}

function startSpeech(e) 
{
    e.preventDefault();
    e.stopPropagation();
    if(muted)
        return;

    let message = {};
    if(speaking) {
        recognition.stop();
        animateSpeechButton(false);
        speaking = false;
        message = {type:"tab_action", action: "stop_speech"};
    } else {
        recognition.start();
        animateSpeechButton(true);
        speaking = true;
        message = {type:"tab_action", action: "start_speech"};

    }
    ws.send(JSON.stringify(message));
}

function stopSpeech(e) 
{
    e.preventDefault();
    e.stopPropagation();
    recognition.stop();
    let message = {type:"tab_action", action: "stop_speech"};
    ws.send(JSON.stringify(message));
}