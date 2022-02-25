import json 

def encode(ws_message,ws_type):
    """
    Generates message for the client

    Message for the client according to the protocol in
    websocketProtocol.md

    Parameters:
    ws_message (str): content of the message
    ws_type (str): type of communication

    Returns: 
    request_json (dict): message according to protocol
    """
    request = dict()
    request['type'] = 'request'
    request['content'] = ws_message
    request_json = json.dumps(request)
    return request_json

def decode(response_json):
    """
    Extracts message from the client

    Decodes from the client according to the protocol in
    websocketProtocol.md

    Parameters:
    response_json (dict): message from the client

    Return:
    user (str): content of the message from the client
    """
    response = json.loads(response_json)
    user = response['content']
    return user