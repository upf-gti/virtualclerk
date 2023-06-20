import {GUI} from "./gui.js"
import {MindRemote} from "./vc_client_tab.js"

import AudioRecorder from 'https://cdn.jsdelivr.net/npm/audio-recorder-polyfill/index.js'
var PERSON_TYPE = true;
var GROUP_TYPE  = false;
var BUILDING_TYPE  = false;

class Finder {

    constructor(debug = false) {
        this.mediaRecorder = null;
        this.chunks = [];
        this.data_ready = false;

        this.person_names_list = [];
        this.person_surnames_list = [];
        this.groups_list = [];
        this.buildings_list = [];
        this.current_data_source = this.person_names_list;

        this.muted = false;
        this.speaking = false;
        this.mindRemote = new MindRemote('wss:dtic-recepcionist.upf.edu/port/3001/ws/');

        this.gui = new GUI();
        this.gui.onMouseUp = this.startSpeech.bind(this);
        // this.gui.onMouseDown = this.startSpeech.bind(this);
        this.lang = 'en';
        this.initApp();
    }

    initApp () 
    {
        window.current_searchtype = PERSON_TYPE;
        window.current_input = '';
        window.start = false;
        this.mindRemote.initWebsocket();
        
        this.initMedia();
        this.setEvents();
        
    }


    async initMedia() {
        
        if(!MediaRecorder.isTypeSupported("audio/webm"))
            window.MediaRecorder = AudioRecorder;
        if (navigator.mediaDevices.getUserMedia) {
            
            console.log('getUserMedia supported.');
            const constraints = { audio: true };

            await navigator.mediaDevices.getUserMedia(constraints)
            .then(
                (stream) => {
                    this.chunks = [];
                    
                    this.mediaRecorder = new MediaRecorder(stream);
                    
                    // this.mediaRecorder.ondataavailable = (e) => {
                    //     this.chunks.push(e.data);
                    //     console.log("just pushed to chunks:" + e + "esp." + e.data);
                    // }
                    this.mediaRecorder.addEventListener("dataavailable", (e) => {
                        this.chunks.push(e.data);
                        console.log("just pushed to chunks:" + e + "esp." + e.data);
                    })

                    this.mediaRecorder.onstop = (e) => {
                        console.log("data available after MediaRecorder.stop() called.");
                        
                        //to listen to your recording
                        const blob = new Blob(this.chunks, { 'type' : 'audio/wav' });
                        // const url = URL.createObjectURL(blob);
                        // console.log(url)
                        // let audio = document.createElement("audio")
                        // audio.autoplay = true
                        // document.body.appendChild(audio)
                        // audio.controls = true;
                        // audio.src = url;
                        // audio.play();
                        //send blob to server
                        this.sendToServer(blob);

                        this.chunks = [];
                    }
                    this.mediaRecorder.addEventListener('stop',  this.mediaRecorder.onstop)
                },
                (err) =>{
                    console.error(err);
                }
            );
        
        }
    }

    sendToServer(e, call = 'text') {
        let xhrRequest = new XMLHttpRequest();

        if (e instanceof Blob)
        {
            xhrRequest.open("POST", "https://dtic-recepcionist.upf.edu/nlp/transcribe", true);
            xhrRequest.setRequestHeader("Content-Type", "audio/wav");
            xhrRequest.send(e);
        }

        if (typeof e == 'string')
        {
            xhrRequest.open("POST", "https://dtic-recepcionist.upf.edu/nlp/"+call, true);
            xhrRequest.setRequestHeader("Content-Type", "text/plain");
            xhrRequest.send(e);
        }
        
        xhrRequest.onreadystatechange = () => {
            if (xhrRequest.readyState === XMLHttpRequest.DONE) {
                if (xhrRequest.status === 200) {
                    // Parse the response JSON into a JavaScript object
                    const responseData = JSON.parse(xhrRequest.response);
                    if(!responseData)
                        return;
                    // Do something with the parsed response data
                    console.log(responseData.query_transcription);
                    console.log(responseData.lang);
                    console.log(responseData.response_transcription);
                    console.log(responseData.audio_path);
                    let content = {
                        text: responseData.response_transcription,
                        data: {audio: responseData.audio, audio_name: responseData.audio_path}
                    }
                    var msg = {
                        type: "response_data",
                        data: JSON.stringify(content)
                    }
                    this.gui.showMessage(responseData.query_transcription, 'me');
                    this.gui.showMessage(content.text);
                    this.mindRemote.ws.send(JSON.stringify(msg));
                } 
                else {
                    console.error('Error:', xhrRequest.statusText);
                }
            }
        };
    }


    requestData() {
        /*PEOPLE DATA*/
        var msg = {
            type: "get_data",
            data_type: "people"
        }
        this.mindRemote.ws.send(JSON.stringify(msg));
        /*GROUPS DATA*/
        var msg = {
            type: "get_data",
            data_type: "groups"
        }
        this.mindRemote.ws.send(JSON.stringify(msg));
        /*PLACES DATA*/
        var msg = {
            type: "get_data",
            data_type: "places"
        }
        this.mindRemote.ws.send(JSON.stringify(msg));
    }


    loadData (data_type, data)
    {
        var data = CSVToArray(data, ";");
        data = data[0].slice(1);
            
        switch(data_type){
            /*PEOPLE DATA*/
            case "people":
                getHTMLRequest("people", {"key": "names"}, "", (data) => {
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
                       this.person_names_list.push(name);
                    }
                    this.updateListDB();
                }, (err) => {console.log(err)}, true)
                
                break;
            /*GROUPS DATA*/
            case "groups":
                for(var i=0; i<data.length; i++)
                {
                    var group = data[0];
                    this.groups_list.push(group);   
                }
                this.updateListDB();
                break;
            /*BUILDINGS DATA*/
            case "places":
                for(var i=0; i<data.length; i++)
                {
                    var building = data[0];
                    this.buildings_list.push(building);          
                }
                this.updateListDB();
                break;
        }
    }


    setEvents() 
    {
        autocomplete(document.getElementById("myInput"), this.current_data_source);
        document.getElementById("cancel-questionnaire").addEventListener('click', this.gui.goBack)
        document.getElementById("iframe-questionnaire").addEventListener('load', this.gui.onLoad)
        /** PEOPLE SEARCH */
        var personToggle = document.getElementById("person-toggle")
        if(personToggle)
        {
            personToggle.addEventListener("click", () => {
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
                this.updateListDB()

            });
        }

        /** GROUP SEARCH */
        var groupToggle = document.getElementById("group-toggle");
        if(groupToggle)
        {
            groupToggle.addEventListener("click", () => {
                var active_filters = document.getElementsByClassName('active');


                if(this.classList.contains("active"))
                {
                    this.updateListDB()
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

                this.updateListDB()

            });
        }

        /** BUILDING SEARCH */
        var buildingToggle = document.getElementById("building-toggle");
        if(buildingToggle)
        {
            buildingToggle.addEventListener("click", () => {
                var active_filters = document.getElementsByClassName('active');

                if(this.classList.contains("active"))
                {
                    this.updateListDB();
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
                this.updateListDB()

            });
        }

        document.getElementById("send-btn").addEventListener("click", () => {
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
            this.mindRemote.ws.send(JSON.stringify(response_message));
            this.changeWaitingView()
        
        });

        document.getElementById("mute-btn").addEventListener("click", () => {
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

            var init_message = {type:"tab_action", action:"mute"}
            this.mindRemote.ws.send(JSON.stringify(init_message));
        });

        document.getElementById("play-btn").addEventListener("click", () => {

            this.gui.showTermsAndConditions(true);
            
        });


        document.getElementById("skip-container").addEventListener("click", () =>{
            skip_container.style.display = "none";
            
            //Speech microphone visible
            this.gui.showSpeechButton(true);
            
            //Send action to server
            var init_message = {type:"tab_action", action:"skip"}
            this.mindRemote.ws.send(JSON.stringify(init_message));
        });

        document.getElementById("lang-selector").addEventListener("change", (e) => {
            this.lang = e.target.value;
            this.gui.selectLanguage();
            this.sendToServer(this.lang ,"language");

            // this.initConversation();
        });

        document.getElementById("lang-btn").addEventListener("click", (e) => {
            this-this.gui.selectLanguage();
        });

        // document.getElementById("btn-selector").addEventListener("click", (e) => {
        //     this.sendToServer(this.lang ,"language");
        
        //     //Speech microphone visible
        //     // this.muted = true;
            
        //     // send start conversation "event" to the server
        //     if(!this.mindRemote.connected_to_session) {
        //         var message = {type: "session", data: {action: "tablet_connection", token: "dev"}};
        //         this.mindRemote.ws.send(JSON.stringify(message))
        //         setTimeout(this.initConversation.bind(this), 1000);
        //         return;
        //     }
        //     this.initConversation();
        // });
        
        document.getElementById("state-btn").addEventListener("click", () => {
           this.gui.changeStateButton();
        });

        document.getElementById("accept-terms").addEventListener("click", () => {
            var age   = document.querySelector("#age").checked;       
            var gapi1 = document.querySelector("#gapi1").checked;
            var gapi2 = document.querySelector("#gapi2").checked;

            if(age && gapi1 && gapi2)
            {
                window.start = true;

                this.gui.showTermsAndConditions(false);
                this.gui.showPlayButton(false);
                            
                //Speech microphone visible
                // this.muted = true;
                
                // send start conversation "event" to the server
                if(!this.mindRemote.connected_to_session) {
                    var message = {type: "session", data: {action: "tablet_connection", token: "dev"}};
                    this.mindRemote.ws.send(JSON.stringify(message))
                    setTimeout(this.initConversation.bind(this), 1000);
                    return;
                }
            }
        });

        document.getElementById("cancel-terms").addEventListener("click", () => {
            this.gui.showTermsAndConditions(false);
        });

        // Just for the moment, to toggle the waiting screen
        document.addEventListener("keypress", (e) => {
            if(e.code == "Digit1")
            {
                var div = document.getElementById("waiting-container");
                if(div.style.display == "none")
                {
                    div.style.display = "auto";
                }
                else
                    div.style.visibility = "hidden";
            }

            if(e.code == "Enter") {
                let text = document.getElementById('user-text').value;
                if(this.muted)
                    return;
                this.sendToServer(text);
                document.getElementById('user-text').value = '';
            }
        });

        // On send text
        document.getElementById("reply-btn").addEventListener('click', () => {
            let text = document.getElementById('user-text').value;
            if(this.muted)
                return;
            this.sendToServer(text);
            document.getElementById('user-text').value = '';
        });

        //Server session Modal
        var s_modal = document.getElementById("session");
        var s_span = document.getElementById("session-close");
        document.getElementById("btn-session").addEventListener("click", () =>{
            
            var s_input = document.getElementById("token");
            if(this.mindRemote.ws && this.mindRemote.ws.readyState== WebSocket.OPEN)
            {
                var message = {type: "session", data: {action: "tablet_connection", token: s_input.value}};
                this.mindRemote.ws.send(JSON.stringify(message))
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

        this.mindRemote.onRequestData = () => {
            // allow input visibility
              var waiting_cnt = document.getElementById("waiting-container")
              waiting_cnt.style.visibility = "hidden";
              
              this.gui.showPlayButton(false);
              this.gui.showSpeechButton(false);

              var cnt = document.getElementById("buttons-container");
              cnt.style.display ='None'; 
              var footer = document.getElementsByTagName("footer")[0];
              footer.style.visibility = "hidden";
              
              this.gui.showInput(true); 
        }

        this.mindRemote.onRequestMap = () => {

        }

        this.mindRemote.onEndConversation = () => {
            this.muted = true;
            
            this.gui.changeStateButton(true);
            this.gui.showSpeechButton(false);
            this.gui.showInput(false);
            this.gui.showHeader(true);
            this.gui.showPlayButton(true);
            this.gui.showStateButton(false);
            this.gui.showQuestionnaire();
        }

        this.mindRemote.onAbortConversation = () => {
            this.gui.changeStateButton(true);
            this.gui.showSpeechButton(false);
            this.gui.showInput(false);
            this.gui.showPlayButton(true);
            this.gui.showStateButton(false);
        }

        this.mindRemote.onMute = () => {
            this.muted = !this.muted;
            this.gui.changeSpeechButton(!this.muted);
        }

        this.mindRemote.onRecognitionStarts = () => {
            console.log('Agent starts recognizing');
            this.gui.showPlayButton(false);
            
            var skip_btn = document.getElementById("skip-container");
            skip_btn.style.visibility = "hidden";

            this.gui.showSpeechButton(true);
            this.gui.changeSpeechButton(true);
        }
        
        this.mindRemote.onRecognitionEnds = () => {
            if(!this.muted)
            {
                console.log('Agent ends recognizing');
                this.gui.changeSpeechButton(false);
            }
        }
        
        this.mindRemote.onSpeechStarts = () => {
            this.muted = true;
            this.gui.changeSpeechButton(false);
            this.gui.animateSpeechButton(false);
        }

        this.mindRemote.onSpeechEnds = () => {
            this.muted = false;
            this.gui.changeSpeechButton(true);
            this.gui.animateSpeechButton(false);
        }

        this.mindRemote.onReturnData = (data) => {
            this.loadData(data.data_type, data.data);
        }
        
        this.mindRemote.onClientConnected = () => {
            this.loadData('people')//requestData();
        }

        this.mindRemote.onClientDisconnected = () => {
            this.mute = true;
            this.gui.showPlayButton(true);
            this.gui.showSpeechButton(false);
            this.gui.animateSpeechButton(false);
            this.gui.showInput(false);
            
            var footer = document.getElementsByTagName("footer")[0];
            footer.style.display = "auto";
        
            this.setEvents();
        }
    }

    changeWaitingView()
    {
        var div = document.getElementById("waiting-container");
        var where = document.getElementById("where-form");
        var speech_btn = document.getElementById("speech-btn");
                
        if(div.style.display == "none")
        {
            div.style.display = "auto";
            where.style.visibility = "hidden";
            speech_btn.style.display = "auto";
        }
        else{
            div.style.visibility = "hidden";
            where.style.display = "auto";
        }
    }

    initConversation() {

        this.gui.showSpeechButton(true);
        this.gui.showStateButton(true);
        var init_message = {type:"tab_action", action:"initialize"}
        this.mindRemote.ws.send(JSON.stringify(init_message));
        // this.sendToServer('Hi');
    }

    resetView()
    {
        window.start = false;
        document.getElementById("play-btn").classList.remove("w3-gray-color")
        document.getElementById("play-btn").classList.add("w3-red-color")
    }

    updateListDB()
    {
        let temp = []
        if(PERSON_TYPE)
            temp = temp.concat(person_names_list)
        if(GROUP_TYPE)
            temp = temp.concat(groups_list)
        if(BUILDING_TYPE)
            temp = temp.concat(buildings_list)

        this.current_data_source = temp;
        autocomplete(document.getElementById("myInput"), this.current_data_source);

    }

    

    // window.SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    // var recognition = new window.SpeechRecognition();
    // recognition.lang = 'en-US';

    // recognition.onspeechstart = () => {
    //     animateSpeechButton(true);
    // }

    // recognition.onspeechend = () => {
    //     animateSpeechButton(false);
    // }
    // var final_transcript = "";
    // recognition.onresult = (event) => {

    //     let interim_transcript = '';
    //     if (typeof(event.results) == 'undefined') {
    //         return;
    //     }

    //     for (let i = event.resultIndex; i < event.results.length; ++i) {

    //       if (event.results[i].isFinal) {

    //         final_transcript += event.results[i][0].transcript;
    //         interim_transcript = ""

    //       } else {
    //         interim_transcript += event.results[i][0].transcript;
    //       }
    //     }
    //     final_transcript = capitalize(final_transcript);
        
    //     //send message to the main app 
    //     // let response_message = {type:"response_data", data: final_transcript}
    //     // ws.send(JSON.stringify(response_message));
    //     sendToServer(final_transcript);

    //     animateSpeechButton(false);
    //     final_transcript = "";
    // }

    async startSpeech(e) 
    {
        e.preventDefault();
        e.stopPropagation();
        if(this.muted)
            return;

        let message = {};
        if(this.speaking) {
    
            // recognition.stop();
            this.mediaRecorder.stop();
            // console.log(mediaRecorder.state);

            this.gui.animateSpeechButton(false);
            this.speaking = false;
            message = {type:"tab_action", action: "stop_speech"};
        } else {

            // recognition.start();
            this.mediaRecorder.start();
            // console.log(mediaRecorder.state);

            this.gui.animateSpeechButton(true);
            this.speaking = true;
            message = {type:"tab_action", action: "start_speech"};

        }
        this.mindRemote.ws.send(JSON.stringify(message));
    }

    stopSpeech(e) 
    {
        e.preventDefault();
        e.stopPropagation();
        // recognition.stop();
        this.mediaRecorder.stop();
        // console.log(mediaRecorder.state);

        this.gui.animateSpeechButton(false);
        this.speaking = false;
        let message = {type:"tab_action", action: "stop_speech"};
        this.mindRemote.ws.send(JSON.stringify(message));
    }

}

export {Finder};




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



var baseURL = "https://dtic-recepcionist.upf.edu/api";
var xmlHttp = new XMLHttpRequest();
var finalURL, mapIter;

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
