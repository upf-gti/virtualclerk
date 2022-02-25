.json with two fields: 'type' and 'content'

Initialize agent when someone comes near the totem
{"type": "start", "content": }

End agent when people leaves he area
{"type": "end", "content": }

Send what agent says
{"type": "request", "content": "text containing what the agent says"}

Receive what user says
{"type": "response", "content": "text containing the answer of the user"}