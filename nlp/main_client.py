import asyncio
import websockets
import os
import json


async def agent_user():
    uri = "ws://10.55.0.7:8765"
    # uri = "ws://localhost:8765"
    async with websockets.connect(uri) as websocket:
        response = dict()
        response['type'] = 'start'
        response_communication = json.dumps(response)
        await websocket.send(response_communication)
        while True:
            request_communication = await websocket.recv()
            request = json.loads(request_communication)
            agent = request['content']
            print("< Agent: {}".format(agent))
            user = input(f"> User: ")
            response = dict()
            response['type'] = 'response'
            response['content'] = user
            response_communication = json.dumps(response)
            await websocket.send(response_communication)
os.system('clear')
asyncio.get_event_loop().run_until_complete(agent_user())
