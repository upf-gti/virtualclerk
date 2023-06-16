
class GUI {
    constructor() {

        this.init_container = document.getElementById("waiting-container");         
        this.buttons_container = document.getElementById("buttons-container");
        this.img_container = document.getElementById("img-container");
        this.skip_container = document.getElementById("skip-container");
        this.modal = document.getElementById("dark-bg");
        
        this.play_btn = document.getElementById("play-btn");
        this.speech_btn = document.getElementById("speech-btn");
        this.mute_btn = document.getElementById("mute-btn");
        
        this.footer = document.getElementsByTagName("footer")[0];
        this.terms = document.getElementById("legalterms");
        this.input = document.getElementById("where-form");
        this.questionnaire = document.getElementById("questionnaire");
        this.containerSelector = document.getElementById("container-selector");
        this.languageSelector = document.getElementById("lang-selector");

        this.questionnaire_active = false;
        
        this.onMouseUp = null;

        this.speech_btn.addEventListener("mouseup", (e) => {
            if(this.onMouseUp)
                this.onMouseUp(e);
        });
    //speech_btn.addEventListener("touchend", stopSpeech);
    }

    /** Show play button */
    showPlayButton(visible) 
    {
        if(visible == undefined)
            visible = this.play_btn.style.visibility == "hidden";
        
        if(visible)
        {
            this.play_btn.style.visibility = "visible";
            this.init_container.innerText = "Press the button to talk with Eva";
            this.init_container.style.visibility = "visible";        
        }
        else
        {
            this.play_btn.style.visibility = "hidden";
        // init_container.style.visibility = "hidden";
        }
    }

    /** Show/Hide input text*/
    showInput(visible)
    {
        if(visible == undefined)
            visible = this.input.style.visibility == "hidden";

        if(visible)
            this.input.style.visibility = "visible"; 
        else
            this.input.style.visibility = "hidden";
    }

    /** Show/Hide speech button */
    showSpeechButton(visible) 
    {
        if(visible == undefined)
            visible = this.speech_btn.style.visibility == "hidden";

        if(visible)
            this.speech_btn.style.visibility = "visible";
        else
            this.speech_btn.style.visibility = "hidden";
        
        this.containerSelector.style.visibility = "hidden";
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
            this.init_container.innerText = "Press the button to talk";
        }
        else 
        {
            this.speech_btn.classList.remove("w3-red-color");
            this.speech_btn.classList.add("w3-gray-color");
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
            visible = this.terms.style.visibility == "hidden";

        if(visible)
        {
            this.terms.style.visibility = "visible"; 
            this.modal.style.visibility = "visible";
        }
        else {
            this.terms.style.visibility = "hidden";
            this.modal.style.visibility = "hidden";

            //Clear checkboxes
            document.querySelector("#age").checked = false;       
            document.querySelector("#gapi1").checked = false;
            document.querySelector("#gapi2").checked = false;
        }
    }

    /** Show the evaluation questionnaire */
    showQuestionnaire()
    {
        this.mute_btn.style.visibility = "hidden";
        this.questionnaire_active = true;
        this.questionnaire.children[0].src = "https://docs.google.com/forms/d/e/1FAIpQLSc_fWSRn40zUxBiV9kaHPWm7eFJ585Tp1N75BR50yf9X7nfrw/viewform?embedded=true";
    }
  
    onLoad (t=1000){
        
        if(!this.questionnaire_active){
        setTimeout(function(){
            var q = document.getElementById("questionnaire");
            q.style.visibility = "hidden";
            this.questionnaire_active = false;
        }, t)
        }else{
            document.getElementById("questionnaire").style.visibility = "visible";
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
        this.containerSelector.style.visibility = "visible";
    }
}

export {GUI};