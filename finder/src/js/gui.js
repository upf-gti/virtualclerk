let init_container = document.getElementById("waiting-container")         
let buttons_container = document.getElementById("buttons-container");
let img_container = document.getElementById("img-container");
let skip_container = document.getElementById("skip-container");
let modal = document.getElementById("dark-bg");

let play_btn = document.getElementById("play-btn");
let speech_btn = document.getElementById("speech-btn");
let mute_btn = document.getElementById("mute-btn");

let footer = document.getElementsByTagName("footer")[0];
let terms = document.getElementById("legalterms");
let input = document.getElementById("where-form");
let questionnaire = document.getElementById("questionnaire");

/** Show play button */
function showPlayButton(visible) 
{
    if(visible == undefined)
        visible = play_btn.style.visibility == "hidden";
    
    if(visible)
    {
        play_btn.style.visibility = "visible";
        init_container.innerText = "Press the button to talk with Eva";
        init_container.style.visibility = "visible";        
    }
    else
    {
        play_btn.style.visibility = "hidden";
       // init_container.style.visibility = "hidden";
    }
}

/** Show/Hide input text*/
function showInput(visible)
{
    if(visible == undefined)
        visible = input.style.visibility == "hidden";

    if(visible)
        input.style.visibility = "visible"; 
    else
        input.style.visibility = "hidden";
}

/** Show/Hide speech button */
function showSpeechButton(visible) 
{
    if(visible == undefined)
        visible = speech_btn.style.visibility == "hidden";

    if(visible)
        speech_btn.style.visibility = "visible";
    else
        speech_btn.style.visibility = "hidden";
}

/** Play/Stop speech button animation */
function animateSpeechButton(play) 
{
    if(play == undefined)
        play = !speech_btn.classList.contains('anim');
    
    if(play)
        speech_btn.classList.add('anim');
    else
        speech_btn.classList.remove('anim');
}


/** Change speech button style (red/gray) depending on if it's listening or not*/
function changeSpeechButton(activate)
{
    if(activate == undefined)
        activate = speech_btn.classList.contains("w3-gray-color");
    
    if(activate)
    {
        speech_btn.classList.remove("w3-gray-color");
        speech_btn.classList.add("w3-red-color");
        init_container.innerText = "Press the button to talk";
    }
    else 
    {
        speech_btn.classList.remove("w3-red-color");
        speech_btn.classList.add("w3-gray-color");
        init_container.innerText = "";
    }
}

/** Change speech button style (active/muted) depending on the previous state*/
function mute(muted) 
{
    if(muted)
      if(!speech_btn.classList.contains('muted'))
        speech_btn.classList.add('muted');
    
    else
      if(speech_btn.classList.contains('muted'))
        speech_btn.classList.remove('muted');
}

/** Show/Hide legal terms and conditions */
function showTermsAndConditions(visible)
{
    if(visible == undefined)
        visible = terms.style.visibility == "hidden";

    if(visible)
    {
        terms.style.visibility = "visible"; 
        modal.style.visibility = "visible";
    }
    else {
        terms.style.visibility = "hidden";
        modal.style.visibility = "hidden";

        //Clear checkboxes
        document.querySelector("#age").checked = false;       
        document.querySelector("#gapi1").checked = false;
        document.querySelector("#gapi2").checked = false;
    }
}

/** Show the evaluation questionnaire */
function showQuestionnaire()
{
    mute_btn.style.visibility = "hidden";
    questionnaire_active = true;
    questionnaire.children[0].src = "https://docs.google.com/forms/d/e/1FAIpQLSc_fWSRn40zUxBiV9kaHPWm7eFJ585Tp1N75BR50yf9X7nfrw/viewform?embedded=true";
}

speech_btn.addEventListener("mouseup", startSpeech);
//speech_btn.addEventListener("touchend", stopSpeech);