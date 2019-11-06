

//Minds are components in charge of coming with an answer to a given question


//Mind component for testing purposes
function MindDialogFlow()
{
	this.project_id = "eva-lcxotv";
	this.session_id = "123456789"; //anything
	this.onMessage = null;

	var proxy = location.origin + "/proxy.php?url=";
	var url = "https://dialogflow.googleapis.com/v2/projects/"+this.project_id+"/agent/sessions/"+this.session_id+":detectIntent";

	fetch(proxy + url)
	.then(function(response) {
		return response.json();
	})
	.then(function(myJson) {
		console.log(myJson);
	});
}

MindDialogFlow.prototype.requestWelcomeMessage = function()
{
	var that = this;
	setTimeout(function(){
		if(that.onMessage)
			that.onMessage({
				type: "msg",
				msgType: "greeting",
				content: "Hello!"
			});
	},2000); //delay
}

MindDialogFlow.prototype.requestAnswer = function( question )
{
	var that = this;
	var answer = MindTest.fake_answers[ Math.floor(MindTest.fake_answers.length * Math.random()) ];
	setTimeout(function(){
		if(that.onMessage)
			that.onMessage({
				type: "msg",
				msgType: "answer",
				content: answer
			});
	},2000); //delay
}


