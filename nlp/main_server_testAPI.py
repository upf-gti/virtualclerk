import re
import json
import asyncio
from difflib import SequenceMatcher

import websockets
import numpy as np
import spacy

import requests
import pdb

from agent_database import load_people, load_groups, load_places, get_googledrive_service
from communication import encode, decode

number_map = {
    'zero': '0',
    'one': '1',
    'two': '2',
    'three': '3',
    'four': '4',
    'five': '5',
    'six': '6',
    'seven': '7',
    'eight': '8',
    'nine': '9'
}


def extract_target(content, nlp):

    doc = nlp(content)

    dobj = None
    pobj = []
    nsubj = None
    root = None
    for token in doc:
        if token.dep_ == "dobj":
            dobj = token
        elif token.dep_ == "pobj":
            pobj.append(token)
        elif token.dep_ == "nsubj":
            nsubj = token
        elif token.dep_ == "ROOT":
            root = token

    if dobj:
        target = dobj
    elif root.pos_ == 'NOUN':
        target = root
    elif pobj:
        target = pobj[0]
    elif nsubj:
        target = nsubj
    else:
        target = root

    return target


def extract_longest_chunk(content, nlp):

    doc = nlp(content)
    chunks = doc.noun_chunks

    max_len = 0
    longest_chunk = None
    for chunk in chunks:

        length = sum(len(t) for t in chunk)

        if not longest_chunk or length > max_len:
            max_len = length
            longest_chunk = chunk

    return longest_chunk


async def handle_not_understood(request, websocket):

    message = ("Sorry, I didn't quite understand what you said."
               " Are you looking for a person, a group or a place?")
    #getAudioPhrase
    #2 phrases
    audios = []
    r = requests.get(api_path+'phrases/phrase', params={'text':message})
    if r.status_code == 200 and len(r.json()):
        audios.append(r.json()[0])
 
    request['type'] = 'request'
    request['content'] = {'text': message, 'data': audios}#message
    request_communication = json.dumps(request)
    await websocket.send(request_communication)
    response_communication = await websocket.recv()

    response = json.loads(response_communication)
    print(response)
    content = response['content']

    return response


async def handle_group(data_groups, websocket, nlp):

    message = "Could you give me please the name of the group?"
    #getAudioPhrase
  
    r = requests.get(api_path+'phrases/phrase', params={'text': message})
    if r.status_code == 200 and len(r.json()):
        data = r.json()[0]
    else: 
        data = None
    request = dict()
    request['type'] = 'request'
    request['content'] = {'text': message, 'data': data}
    print(message)
    request_json = json.dumps(request)
           
    #request_json = encode(message, 'request')
    await websocket.send(request_json)
    response_json = await websocket.recv()
    content = decode(response_json)
    print(content)
    chunk = extract_longest_chunk(content, nlp)

    similarity_vector = []
    num_groups = data_groups.shape[0]
    for i in range(num_groups):
        group_name = data_groups[i][0]
        score = SequenceMatcher(None, str(chunk), group_name).quick_ratio()

        similarity_vector.append(score)

    group_idx = similarity_vector.index(max(similarity_vector))
    office = data_groups[group_idx, 1]
    message = ("You can find the leader of the {}, {} "
               "in the office {}.").format(
        data_groups[group_idx, 0],
        data_groups[group_idx, 2].capitalize(),
        # data_groups[group_idx, 3].capitalize(), # new csv format doesn't required this field (name&surname in the same cell)
        office)
    
    audios = []
    #audio phrase
    r = requests.get(api_path+'phrases/phrase', params={'text':"You can find the leader of the"})
    if len(r.json()):
        audios.append(r.json()[0])
    #audio group
    r = requests.get(api_path+'groups/group', params={'name':data_groups[group_idx, 0]})
    if len(r.json()):
        audios.append(r.json()[0])
    #audio person
    r = requests.get(api_path+'people/person', params={'name':data_groups[group_idx, 2]})
    if len(r.json()):
        audios.append(r.json()[0])
    
    #audio phrase
    r = requests.get(api_path+'phrases/phrase', params={'text':"in the office"})
    if len(r.json()):
        audios.append(r.json()[0])

    #audio office
    r = requests.get(api_path+'offices/id/' + office)
    if len(r.json()):
        audios.append(r.json()[0])

    data = {'text': message, 'audios': audios}
    return data


async def handle_person(data_people, nlp, websocket):

    # Cutoff name --> When computing the similarity of
    # the surname, we will do it for the n first
    message = "Could you please type the name and surname on the tablet?"
    #request_json = encode(message, 'request')
    r = requests.get(api_path+'phrases/phrase', params={'text': message})
    if r.status_code == 200 and len(r.json()):
        data = r.json()[0]
    else: 
        data = None
    request = dict()
    request['type'] = 'request'
    request['content'] = {'text': message, 'data': data}
    print(message)
    request_json = json.dumps(request)

    await websocket.send(request_json)
    response_json = await websocket.recv()
    content = decode(response_json)
    # chunk = extract_longest_chunk(content, nlp)
    # if chunk:
    #     extracted = str(chunk)
    #     compare_complete = len(chunk) > 1

    # else:
    #     extracted = content
    #     compare_complete = False
    extracted = content
    compare_complete = True

    extracted = extracted.lower()

    idx = 0
    found = None
    candidates = []
    similarity_vector = []
    while idx < len(data_people) and not found:

        name = data_people[idx, 0].lower()
        surname = data_people[idx, 1].lower()
        complete_name = name + " " + surname
        
        if compare_complete:
            score = SequenceMatcher(None, extracted, complete_name).quick_ratio()

        else:
            score = SequenceMatcher(None, extracted, surname).quick_ratio()

        similarity_vector.append((score, idx))

        if complete_name in extracted:
            found = idx

        elif surname and surname in extracted:
            candidates.append((score, idx))
        idx += 1

    if found:
        idx = found

    elif candidates:
        # TODO: Tell user multiple candidates available, ask for name.
        sorted_names = sorted(candidates, reverse=True)
        _, idx = sorted_names[0]

    else:
        sorted_names = sorted(similarity_vector, reverse=True)
        _, idx = sorted_names[0]
    
    audios = []
    name = data_people[idx, 0].capitalize()
    surname = data_people[idx, 1].capitalize()
    
    #complete_name = data_people[idx,0].capitalize
    #r = requests.get(api_path+'people/person', params={'name': complete_name})
    r = requests.get(api_path+'people/person', params={'name': name + ' ' + surname})
    if r.status_code == 200 and len(r.json()):
        data = r.json()[0]
    else: 
        data = None
    audios.append(data)

    r = requests.get(api_path+'phrases/phrase', params={'text': 'is in the office'})
    if r.status_code == 200 and len(r.json()):
        data = r.json()[0]
    else: 
        data = None
    audios.append(data)

    office = data_people[idx, 2]
    r = requests.get(api_path+'offices/id/'+office)
    if r.status_code == 200 and len(r.json()):
        data = r.json()[0]
    else: 
        data = None
    audios.append(data)
    #message = "{} is in the office {}.".format(complete_name, office)
    message = "{} {} is in the office {}.".format(name, surname, office)
    data = {'text': message, 'audios': audios}
    #return message
    return data


async def handle_place(data_places, floors, nlp, websocket):

    message = "Where do you want to go?"
    r = requests.get(api_path+'phrases/phrase', params={'text': message})
    if r.status_code == 200 and len(r.json()):
        data = r.json()[0]
    else: 
        data = None
    request = dict()
    request['type'] = 'request'
    request['content'] = {'text': message, 'data': data}
    print(message)
    request_json = json.dumps(request)
    #request_json = encode(message, 'request')
    await websocket.send(request_json)
    response_json = await websocket.recv()
    content = decode(response_json)

    message = None
    audios = []
    while not message and "cancel" not in content.lower():
        audios = []
        
        replaced_content = content
        print(content)
        for key, value in number_map.items():
            replaced_content = replaced_content.replace(key, value)

        replaced_content = replaced_content.replace(" ", "")
        match = re.search(r"(\d\d)\.?(\d\d\d)", replaced_content)
        if not match:
            match = re.search(r"(\d\d)\/?(\d\d\d)", replaced_content)
        if match:
            code = match.group()
            building_code = match.group(1)
            room_number = match.group(2)

            place_idx = np.where(data_places[:, 1] == building_code[1])
            building = data_places[place_idx, 0][0][0]
            floor = int(room_number[0])

            if building_code in ("52", "55"):
                if floor == 0: 
                    message = ("That room is located on this floor. You just need to go to the corridor and you will find it.")
                    r = requests.get(api_path+'phrases/phrase', params={'text': message})
                    if r.status_code == 200 and len(r.json()):
                        data = r.json()[0]
                    else: 
                        data = None
                    audios.append(data)
                else:
                    r = requests.get(api_path+'phrases/phrase', params={'text': 'That room is located in the'})
                    if r.status_code == 200 and len(r.json()):
                        data = r.json()[0]
                    else: 
                        data = None
                    audios.append(data)

                    message = ("That room is located in the {building} building in the {floors[floor]} floor."
                            " I attach here a map.")
                    
                    r = requests.get(api_path+'places/place', params={'name': building})
                    if r.status_code == 200 and len(r.json()):
                        data = r.json()[0]
                    else: 
                        data = None
                    audios.append(data)

                    r = requests.get(api_path+'phrases/phrase', params={'text': 'building in the'})
                    if r.status_code == 200 and len(r.json()):
                        data = r.json()[0]
                    else: 
                        data = None
                    audios.append(data)

                    r = requests.get(api_path+'places/place', params={'name': floors[floor]})
                    if r.status_code == 200 and len(r.json()):
                        data = r.json()[0]
                    else: 
                        data = None
                    audios.append(data)

                    r = requests.get(api_path+'phrases/phrase', params={'text': 'floor. I attach here a map.'})
                    if r.status_code == 200 and len(r.json()):
                        data = r.json()[0]
                    else: 
                        data = None
                    audios.append(data)
            #getAudioPhrase + getAudioBuilding + getAudioPhrase + getAudioFloor + getAudioPhrase                         
            else:
                message = ("That room is located in the {building} building."
                           " I attach here a map.")
                r = requests.get(api_path+'phrases/phrase', params={'text': 'That room is located in the'})
                if r.status_code == 200 and len(r.json()):
                    data = r.json()[0]
                else: 
                    data = None
                audios.append(data)

                r = requests.get(api_path+'places/place', params={'name': building})
                if r.status_code == 200 and len(r.json()):
                    data = r.json()[0]
                else: 
                    data = None
                audios.append(data)

                r = requests.get(api_path+'phrases/phrase', params={'text': 'building. I attach here a map.'})
                if r.status_code == 200 and len(r.json()):
                    data = r.json()[0]
                else: 
                    data = None
                audios.append(data)
                #getAudioPhrase + getAudioBuilding + getAudioPhrase

        else:
            target_token = extract_target(content, nlp)
            target = str(target_token).lower()
            print("TARGET: " + target)
            if target == "library":
                message = ("Use the elevator or the stairs to go to the minus 2 floor."
                           " Then follow the corridor and go upstairs."
                           " Once in Gutenberg just go to the building in front of the terrace.")
                #getAudioPhrase
                r = requests.get(api_path+'phrases/phrase', params={'text': message})
                if r.status_code == 200 and len(r.json()):
                    audios.append(r.json()[0])

                print(message)
                
            elif target == 'auditorium':
                message = ("The auditorium is located in the minus 2 floor."
                           " Get the elevator or the stairs and follow the corridor."
                           " It will be at the end on the right.")
                #getAudioPhrase
                r = requests.get(api_path+'phrases/phrase', params={'text': message})
                if r.status_code == 200 and len(r.json()):
                    audios.append(r.json()[0])
            elif target in ['café', 'cafeteria', 'restaurant', 'bar', 'cantina']:
                message = ("The {target} is located in the minus 2 floor."
                           " Get the elevator or the stairs and follow the corridor."
                           " It will be at the end on the left.")
                #getAudioPhrase
                r = requests.get(api_path+'phrases/phrase', params={'text': message})
                if r.status_code == 200 and len(r.json()):
                    audios.append(r.json()[0])
                else:
                    r = requests.get(api_path+'places/place', params={'name': target})
                    if r.status_code == 200 and len(r.json()):
                        audios.append(r.json()[0])
                    r = requests.get(api_path+'phrases/phrase', params={'text': "is located in the minus 2 floor."
                           " Get the elevator or the stairs and follow the corridor."
                           " It will be at the end on the left."})
                    if r.status_code == 200 and len(r.json()):
                        audios.append(r.json()[0])

            elif target in ['secretaria', 'secretary', 'administration', 'admin']:
                message = ("Secretaria is located on this floor."
                           " You just need to go to the corridor next to the stairs and you will find it.")
                #getAudioPhrase
                r = requests.get(api_path+'phrases/phrase', params={'text': message})
                if r.status_code == 200 and len(r.json()):
                    audios.append(r.json()[0])
            elif target == 'gutenberg':
                message = ("Use the elevator or the stairs to go to the minus 2 floor."
                           " Then follow the corridor and go upstairs.")
                #getAudioPhrase
                r = requests.get(api_path+'phrases/phrase', params={'text': message})
                if r.status_code == 200 and len(r.json()):
                    audios.append(r.json()[0])
            else:
                message = 'I may not know this place. Could you rephrase it? Say cancel to go back.'
                #getAudioPhrase
                r = requests.get(api_path+'phrases/phrase', params={'text': message})
                if r.status_code == 200 and len(r.json()):
                    audios.append(r.json()[0])
                #request_json = encode(message, 'request')
                print(message)
                request = dict()
                request['type'] = 'request'
                request['content'] = {'text': message, 'data': audios}
                request_json = json.dumps(request)
                await websocket.send(request_json)
                response_json = await websocket.recv()
                content = decode(response_json)
                audios = []
                message = None

    data = {'text': message, 'audios': audios}
    return data
    #return message


async def agent(websocket, path):
    request = dict()
    nlp = spacy.load('en_core_web_sm')

    service = get_googledrive_service()
    data_people = load_people(service, people_file_id, path_to_researchers, api_path)
    data_groups = load_groups(service, groups_file_id, path_to_groups)
    data_places = load_places(service, places_file_id, path_to_places)

    person_keywords = ['person', 'researcher', 'employee', 'people', 'member']  # keywords for person path
    group_keywords = ['group', 'organization', 'research group']  # keywords for group path
    place_keywords = ['place', 'location', 'localization', 'room', 'office']  # keywords for place path
    nothing_keywords = ['nothing', 'anything', 'no', "it's all"]
    floors = {
        1: 'first',
        2: 'second',
        3: 'third',
        4: 'fourth',
        5: 'fifth',
        6: 'sixth',
        7: 'seventh',
        8: 'eighth',
        9: 'ninth'
    }

    while True:
        response_communication = await websocket.recv()
        response = json.loads(response_communication)
        res = None
        if response['type'] == "start":

            presentation = ("Hi, my name is Eva, the new ICT Departament Virtual Assistant! I'll we happy to help you."
                            " Are you looking for a person, a research group or a room in particular?")
            request['type'] = 'request'
            payload = {'text': presentation}
            r = requests.get(api_path+'phrases/phrase', params=payload)
            if r.status_code==200 and len(r.json()):
                data = r.json()[0]
            else: 
                data = None
            request['content'] = {'text': presentation, 'data': [data]}
            #request['content'] = presentation
            #getAudioPhrase
            request_communication = json.dumps(request)
            await websocket.send(request_communication)

            response_communication = await websocket.recv()
            print("RESPONSE: ", response_communication)
            response = json.loads(response_communication)
            if response['type'] == 'end':
                conversation = False
                request_json = encode('','end')
                continue
            content = response['content']
            print("CONTENT: ", content)
            conversation = True
            while conversation:
                audios = []
                if response['type'] == 'end':
                    conversation = False
                    request_json = encode('','end')
                    continue
                content = response['content']
                target_token = extract_target(content, nlp)
                target = str(target_token).lower()
                
                if target in person_keywords:
                    #data_people = getPeopleNames()
                    res = await handle_person(data_people, nlp, websocket)

                elif target in group_keywords:
                    #data_groups = getGroupNames()
                    res = await handle_group(data_groups, websocket, nlp)

                elif target in place_keywords:
                    #data_places = getGroupNames()
                    res = await handle_place(data_places, floors, nlp, websocket)
     
                elif target in ["skip"]:
                    message = 'Are you looking for a place, a researcher or a group?'
                     #getAudioPhrase
                    request['type'] = 'request'

                    r = requests.get(api_path+'phrases/phrase', params={'text': message})
                    if r.json()[0]:
                        data = r.json()[0]
                    else: 
                        data = None
                    request['content'] = {'text': message, 'data': [data]}
                    request['type'] = 'request'
                    request_json = json.dumps(request)
                    await websocket.send(request_json)
                    response_json = await websocket.recv()
                    #content = decode(response_json)
                    response = json.loads(response_json)
                    continue

                elif target in nothing_keywords:
                    conversation = False
                    message = 'See you next time, bye.'
                    #getAudioPhrase
                    request['type'] = 'request'

                    r = requests.get(api_path+'phrases/phrase', params={'text': message})
                    if r.json()[0]:
                        data = r.json()[0]
                    else: 
                        data = None
                    request['content'] = {'text': message, 'data': [data]}
                   ## request_json = encode(message, 'request')
                    #request_json = encode(request, 'request')
                    request_json = json.dumps(request)
                    await websocket.send(request_json)
                    request_json = encode('', 'end')
                    await websocket.send(request_json)
                    continue
                else:
                    response = await handle_not_understood(request, websocket)
                    continue
                if res:
                    message = res['text']
                message = "{} Do you need something else?".format(message)
                #getAudioPhrase
                payload = {'text': 'Do you need something else?'}
                r = requests.get(api_path+'phrases/phrase', params=payload)
                #print(r.json())
                if r.status_code ==200 and len(r.json()):
                    data = r.json()[0]
                else: 
                    data = None
                if res and res['audios']:
                    audios = res['audios']
                audios.append(data)
                request['type'] = 'request'
                request['content'] = {'text': message, 'data': audios}
                #request_json = encode(message, 'request')
                #request_json = encode(request, 'request')
                request_json = json.dumps(request)
                await websocket.send(request_json)
                response_json = await websocket.recv()
                #content = decode(response_json)
                response = json.loads(response_json)
                content = response ['content']

                if "No" in content:
                    conversation = False
                    message = 'See you next time, bye.'
                    #getAudioPhrase
                    request['type'] = 'request'

                    r = requests.get(api_path+'phrases/phrase', params={'text': message})
                    if r.json()[0]:
                        data = r.json()[0]
                    else: 
                        data = None
                    request['content'] = {'text': message, 'data': data}
                   ## request_json = encode(message, 'request')
                    #request_json = encode(request, 'request')
                    request_json = json.dumps(request)
                    await websocket.send(request_json)
                    request_json = encode('', 'end')
                    await websocket.send(request_json)
                    
        elif response['type'] == 'end':
            conversation = False
            agent = 'See you next time, bye.'
            #getAudioPhrase
            request['type'] = 'request'

            r = requests.get(api_path+'phrases/phrase', params={'text': agent})
            if r.json()[0]:
                data = r.json()[0]
            else: 
                data = None
            request['content'] = {'text': agent, 'data': data}
            #request_json = encode(request,'request')
            #request_json = encode(agent,'request')
            request_json = json.dumps(request)
            await websocket.send(request_json)
            request_json = encode('','end')
            await websocket.send(request_json)

        else:
            message = f'I\'m confused... I have received a {response["type"]} message.'
            #getAudioPhrase
            request_json = encode(message, 'request')
            await websocket.send(request_json)
            request_json = encode('', 'end')
            await websocket.send(request_json)


with open('configuration.json', 'r') as file:
    parameters_dict = json.load(file)

path_to_researchers = parameters_dict['path_to_researchers']
path_to_groups = parameters_dict['path_to_groups']
path_to_places = parameters_dict['path_to_places']
people_file_id = parameters_dict['people_file_id']
groups_file_id = parameters_dict['groups_file_id']
places_file_id = parameters_dict['places_file_id']

threshold_similarity = parameters_dict['threshold_similarity']

if __name__ == '__main__':

    websocket_port = parameters_dict['websocket_port']
    timeout = parameters_dict['timeout']
    port = websocket_port
    ip = parameters_dict['ip']  # "10.55.0.7"
    api_path = parameters_dict['api']
    start_server = websockets.serve(agent, ip, port, ping_interval=timeout)
    asyncio.get_event_loop().run_until_complete(start_server)
    asyncio.get_event_loop().run_forever()

    # create GMAIL account for the agent
    # test similarity (Pablo case) and threshold similarity

    """
    – Capital letter places and groups
    – Reorganize dialog manager
    – No queremos un menú. El agente tiene que entender lo que la gente quiere sin
    preguntar explicitamente si es researcher, lugar, etc.etc.
    – Lugares es fácil. Son números / 'auditorio'. Keyword 'room'
    – Para grupos/personas detectamos los nombres, miramos similaridad con grupos.
    – Si es baja --> Researcher. Si es alta --> grupo.
    – Si hay keywords de research --> grupo
    """
