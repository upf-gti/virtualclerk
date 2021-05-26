var PERSON_TYPE = true;
var GROUP_TYPE  = false;
var BUILDING_TYPE  = false;

var data_ready = false;

var persons_json = {};
var groups_json = {};
var buildings_json = {};

var person_names_list = [];
var person_surnames_list = [];
var groups_list = [];
var buildings_list = [];
var current_data_source = person_names_list;

var ws = null;

function initApp ()
{
    window.current_searchtype = PERSON_TYPE;
    window.current_input = '';
    window.start = false;
    loadData();
    setEvents();
    ws = init_websocket();
}

function loadData ()
{
    /* set up XMLHttpRequest */
    var url = "https://webglstudio.org/users/dmoreno/projects/finder/fields.xlsx";
    var oReq = new XMLHttpRequest();
    oReq.open("GET", url, true);
    oReq.responseType = "arraybuffer";

    oReq.onload = function(e) {
        var arraybuffer = oReq.response;

        /* convert data to binary string */
        var data = new Uint8Array(arraybuffer);
        var arr = new Array();
        for (var i = 0; i != data.length; ++i) arr[i] = String.fromCharCode(data[i]);
        var bstr = arr.join("");

        /* Call XLSX */
        var workbook = XLSX.read(bstr, {
            type: "binary"
        });
        console.log(workbook.SheetNames)
        /* DO SOMETHING WITH workbook HERE */
        var people_sheet = workbook.SheetNames[0];
        /* Get worksheet */
        var people_worksheet = workbook.Sheets[people_sheet];
        persons_json = XLSX.utils.sheet_to_json(people_worksheet, {raw: true});
        // console.log(XLSX.utils.sheet_to_json(people_worksheet, {
        //     raw: true
        // }));
        var group_sheet = workbook.SheetNames[3];
        /* Get worksheet */
        var group_worksheet = workbook.Sheets[group_sheet];
        groups_json = XLSX.utils.sheet_to_json(group_worksheet, {raw: true});

        var building_sheet = workbook.SheetNames[5];
        /* Get worksheet */
        var building_worksheet = workbook.Sheets[building_sheet];
        buildings_json = XLSX.utils.sheet_to_json(building_worksheet, {raw: true});

        generate_lists([persons_json,groups_json,buildings_json], updateListDB);
    }

    oReq.send();
}
function generate_lists(jsons_array, onComplete)
{
    p_json = jsons_array[0];
    g_json = jsons_array[1];
    b_json = jsons_array[2];

    for(var i = 0; i<p_json.length; i++)
        person_names_list.push(p_json[i]['Person name'] + ' ' + p_json[i]['Person surname']);

    for(var i = 0; i<g_json.length; i++)
        groups_list.push(g_json[i]['Group name']);

    for(var i = 0; i<b_json.length; i++)
        buildings_list.push(b_json[i]['Building name']);

    if(onComplete)
        onComplete()
}

function setEvents()
{
    autocomplete(document.getElementById("myInput"), current_data_source);

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
        if(!input)
            alert('You have to write and select something')
        window.current_input = input;
        document.getElementById("myInput").value = "";
        // send input to the server
        var response_message = {type:"response_data", data:input}
        ws.send(JSON.stringify(response_message));
        changeWaitingView()
        /*else
        {
            alert('Implement sendInfo() method, and send: ' + input)

        }*/
    });
    document.getElementById("play-btn").addEventListener("click", function() {
        window.start = true;
        document.getElementById("play-btn").classList.remove("w3-red")
        document.getElementById("play-btn").classList.add("w3-gray")
        // send start conversation "event" to the server
        var init_message = {type:"tab_action", action:"initialize", time:timestamp}
        ws.send(JSON.stringify(init_message));
        /*else
        {
            alert('Implement sendInfo() method, and send: ' + input)

        }*/
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
    if(div.style.visibility == "hidden")
    {
        div.style.visibility = "visible";
    }
    else
        div.style.visibility = "hidden";
}
function resetView()
{
  window.start = false;
  document.getElementById("play-btn").classList.remove("w3-gray")
  document.getElementById("play-btn").classList.add("w3-red")
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
function autocomplete(inp, arr) {
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
