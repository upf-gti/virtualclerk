
class GUI {
    constructor() {

        this.header = document.getElementById("header");
        this.init_container = document.getElementById("waiting-container");         
        this.buttons_container = document.getElementById("buttons-container");
        this.img_container = document.getElementById("img-container");
        this.skip_container = document.getElementById("skip-container");
        this.chat_container = document.getElementById("chat-container");
        this.log_container = document.getElementById("log-container");
        this.modal = document.getElementById("dark-bg");
        
        this.play_btn = document.getElementById("play-btn");
        this.speech_btn = document.getElementById("speech-btn");
        this.reply_btn = document.getElementById("reply-btn");
        this.mute_btn = document.getElementById("mute-btn");
        this.lang_btn = document.getElementById("lang-btn");
        this.state_btn = document.getElementById("state-btn");
        
        this.footer = document.getElementsByTagName("footer")[0];
        this.terms = document.getElementById("legalterms");
        this.input = document.getElementById("where-form");
        this.questionnaire = document.getElementById("questionnaire");
        this.containerSelector = document.getElementById("container-selector");
        this.languageSelector = document.getElementById("lang-selector");

        this.questionnaire_active = false;
        
        this.onMouseDown = null;
        this.onMouseUp = null;

        this.speech_btn.addEventListener("mouseup", (e) => {
            if(this.onMouseUp)
                this.onMouseUp(e);
        });
        // this.speech_btn.addEventListener("touchstart", (e) => {
        //     if(this.onMouseDown)
        //         this.onMouseDown(e);
        // });
    //speech_btn.addEventListener("touchend", stopSpeech);
    }

    showHeader(visible) 
    {
        if(visible == undefined)
        visible = this.header.style.display == "none";
    
        if(visible)
        {
            this.header.style.display = "block";    
        }
        else
        {
            this.header.style.display = "none";
        // init_container.style.display = "none";
        }
    }

    /** Show play button */
    showPlayButton(visible) 
    {
        if(visible == undefined)
            visible = this.play_btn.style.display == "none";
        
        if(visible)
        {
            this.play_btn.style.display = "block";
            this.init_container.innerText = "Press the button to talk with Eva";
            this.init_container.style.display = "block";        
        }
        else
        {
            this.play_btn.style.display = "none";
        // init_container.style.display = "none";
        }
    }

    /** Show/Hide input text*/
    showInput(visible)
    {
        if(visible == undefined)
            visible = this.input.style.display == "none";

        if(visible)
            this.input.style.display = "block"; 
        else
            this.input.style.display = "none";
    }

    /** Show/Hide speech button */
    showSpeechButton(visible) 
    {
        if(visible == undefined)
            visible = this.speech_btn.style.display == "none";

        if(visible)
            this.speech_btn.style.display = "block";
        else
            this.speech_btn.style.display = "none";
        
        this.containerSelector.style.display = "none";
    }

    /** Play/Stop speech button animation */
    animateSpeechButton(play) 
    {
        if(play == undefined)
            play = !this.speech_btn.classList.contains('anim');
        
        if(play)
            this.speech_btn.classList.add('anim');
        else
            this.speech_btn.classList.remove('anim');
    }


    /** Change speech button style (red/gray) depending on if it's listening or not*/
    changeSpeechButton(activate)
    {
        if(activate == undefined)
            activate = this.speech_btn.classList.contains("w3-gray-color");
        
        if(activate)
        {
            this.speech_btn.classList.remove("w3-gray-color");
            this.speech_btn.classList.add("w3-red-color");
            this.reply_btn.classList.remove("w3-gray-color");
            this.reply_btn.classList.add("w3-red-color");
            
            this.init_container.innerText = "Press the button to talk";
        }
        else 
        {
            this.speech_btn.classList.remove("w3-red-color");
            this.speech_btn.classList.add("w3-gray-color");
            this.reply_btn.classList.remove("w3-red-color");
            this.reply_btn.classList.add("w3-gray-color");
            
            this.init_container.innerText = "";
        }
    }

    /** Change speech button style (active/muted) depending on the previous state*/
    mute(muted) 
    {
        if(muted)
            if(!this.speech_btn.classList.contains('muted'))
                this.speech_btn.classList.add('muted');
            
            else
                if(this.speech_btn.classList.contains('muted'))
                    this.speech_btn.classList.remove('muted');
    }

    /** Show/Hide legal terms and conditions */
    showTermsAndConditions(visible)
    {
        if(visible == undefined)
            visible = this.terms.style.display == "none";

        if(visible)
        {
            this.terms.style.display = "block"; 
            this.modal.style.display = "block";
        }
        else {
            this.terms.style.display = "none";
            this.modal.style.display = "none";

            //Clear checkboxes
            document.querySelector("#age").checked = false;       
            document.querySelector("#gapi1").checked = false;
            document.querySelector("#gapi2").checked = false;
        }
    }

    /** Show the evaluation questionnaire */
    showQuestionnaire()
    {
        this.mute_btn.style.display = "none";
        this.questionnaire_active = true;
        this.questionnaire.children[0].src = "https://docs.google.com/forms/d/e/1FAIpQLSc_fWSRn40zUxBiV9kaHPWm7eFJ585Tp1N75BR50yf9X7nfrw/viewform?embedded=true";
    }
    
    /** Show chat container */
    showChat(visible)
    {
        if(visible == undefined)
            visible = this.chat_container.style.display == "none";

        if(visible)
            this.chat_container.style.display = "block";
        else
            this.chat_container.style.display = "none";
        
    }

    /** Show user/agent chat message */
    showMessage(msg, className)
	{
		var div = document.createElement("div");
		div.innerHTML = msg;
		div.className = "msg " + (className||"");
		this.log_container.appendChild(div);
		this.log_container.scrollTop = 100000;
		return div;

	}

    /** Show/Hide state (chat/micro) button */
    showStateButton(visible)
    {
        if(visible == undefined)
            visible = this.terms.style.display == "none";

        if(visible)
        {
            this.state_btn.style.display = "block"; 
            this.lang_btn.style.display = "block"; 
        }
        else {
            this.state_btn.style.display = "none";
            this.lang_btn.style.display = "none";
        }
    }

    /** Change state (chat/micro) button */
    changeStateButton(chat)
    {
        if(chat == undefined)
            chat = this.state_btn.classList.contains("fa-microphone");
        
        if(chat)
        {
            this.state_btn.classList.remove("fa-microphone");
            this.state_btn.classList.add("fa-comments");
            this.chat_container.style.display = "none";
            this.showSpeechButton(true);
            this.showHeader(true);
        }
        else 
        {
            this.state_btn.classList.remove("fa-comments");
            this.state_btn.classList.add("fa-microphone");
            this.chat_container.style.display = "flex";
            this.showSpeechButton(false);
            this.showHeader(false);
        }
    }

    onLoad (t=1000){
        
        if(!this.questionnaire_active){
        setTimeout(function(){
            var q = document.getElementById("questionnaire");
            q.style.display = "none";
            this.questionnaire_active = false;
        }, t)
        }else{
            document.getElementById("questionnaire").style.display = "block";
            this.questionnaire_active = true;
        }
    }
    
    goBack(){
        this.onLoad(0)
    }

    selectLanguage() {

        if(!this.languageSelector.children.length) {
            let options = {'af': 'afrikaans', 'sq': 'albanian', 'am': 'amharic', 'ar': 'arabic', 'hy': 'armenian', 'az': 'azerbaijani', 'eu': 'basque', 'be': 'belarusian', 'bn': 'bengali', 'bs': 'bosnian', 'bg': 'bulgarian', 'ca': 'catalan', 'ceb': 'cebuano', 'ny': 'chichewa', 'zh-cn': 'chinese (simplified)', 'zh-tw': 'chinese (traditional)', 'co': 'corsican', 'hr': 'croatian', 'cs': 'czech', 'da': 'danish', 'nl': 'dutch', 'en': 'english', 'eo': 'esperanto', 'et': 'estonian', 'tl': 'filipino', 'fi': 'finnish', 'fr': 'french', 'fy': 'frisian', 'gl': 'galician', 'ka': 'georgian', 'de': 'german', 'el': 'greek', 'gu': 'gujarati', 'ht': 'haitian creole', 'ha': 'hausa', 'haw': 'hawaiian', 'iw': 'hebrew', 'hi': 'hindi', 'hmn': 'hmong', 'hu': 'hungarian', 'is': 'icelandic', 'ig': 'igbo', 'id': 'indonesian', 'ga': 'irish', 'it': 'italian', 'ja': 'japanese', 'jw': 'javanese', 'kn': 'kannada', 'kk': 'kazakh', 'km': 'khmer', 'ko': 'korean', 'ku': 'kurdish (kurmanji)', 'ky': 'kyrgyz', 'lo': 'lao', 'la': 'latin', 'lv': 'latvian', 'lt': 'lithuanian', 'lb': 'luxembourgish', 'mk': 'macedonian', 'mg': 'malagasy', 'ms': 'malay', 'ml': 'malayalam', 'mt': 'maltese', 'mi': 'maori', 'mr': 'marathi', 'mn': 'mongolian', 'my': 'myanmar (burmese)', 'ne': 'nepali', 'no': 'norwegian', 'ps': 'pashto', 'fa': 'persian', 'pl': 'polish', 'pt': 'portuguese', 'pa': 'punjabi', 'ro': 'romanian', 'ru': 'russian', 'sm': 'samoan', 'gd': 'scots gaelic', 'sr': 'serbian', 'st': 'sesotho', 'sn': 'shona', 'sd': 'sindhi', 'si': 'sinhala', 'sk': 'slovak', 'sl': 'slovenian', 'so': 'somali', 'es': 'spanish', 'su': 'sundanese', 'sw': 'swahili', 'sv': 'swedish', 'tg': 'tajik', 'ta': 'tamil', 'te': 'telugu', 'th': 'thai', 'tr': 'turkish', 'uk': 'ukrainian', 'ur': 'urdu', 'uz': 'uzbek', 'vi': 'vietnamese', 'cy': 'welsh', 'xh': 'xhosa', 'yi': 'yiddish', 'yo': 'yoruba', 'zu': 'zulu', 'fil': 'Filipino', 'he': 'Hebrew'};
            for(let lang in options) {
                let opt = document.createElement('option');
                opt.value = lang;
                opt.innerHTML = options[lang];
                if(lang == 'en') {
                    opt.selected = true;
                }
                this.languageSelector.appendChild(opt);
            }
        }
        if(this.containerSelector.style.display == "block")
            this.containerSelector.style.display = "none";
        else
            this.containerSelector.style.display = "block";
    }
}

export {GUI};