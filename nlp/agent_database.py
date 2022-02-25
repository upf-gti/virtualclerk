from __future__ import print_function
import os.path
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google.oauth2 import service_account
import csv
import numpy as np

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/drive',
'https://www.googleapis.com/auth/drive.file',
'https://www.googleapis.com/auth/drive.readonly',
'https://www.googleapis.com/auth/drive.metadata.readonly',
'https://www.googleapis.com/auth/drive.appdata',
'https://www.googleapis.com/auth/drive.metadata',
'https://www.googleapis.com/auth/drive.photos.readonly',
'https://www.googleapis.com/auth/drive.activity',
'https://www.googleapis.com/auth/drive.scripts']

# The ID of a sample document.
#https://drive.google.com/file/d/1uKkiW4JbF4AZ2F2msvvajMdvZ1jhAgK_/view?usp=sharing
PEOPLE_DOC_ID = '1R7Psnyfxj9qYtE9Qli6JXR3ehj25NTtj'
DOCUMENT_ID = '1uKkiW4JbF4AZ2F2msvvajMdvZ1jhAgK_'#'1ar4j46cg-Ftxix4XZhO-IBepnXkJnMwI'#'1R7Psnyfxj9qYtE9Qli6JXR3ehj25NTtj'



"""Functions to load and store the different databases"""
def get_googledrive_service():
    creds = None
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    """if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)"""
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            """flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
                creds = flow.run_local_server(port=0)"""
            creds = service_account.Credentials.from_service_account_file(
                'virtual-assistant-privat-key.json', scopes=SCOPES)
            
            
        # Save the credentials for the next run
        """ with open('token.json', 'w') as token:
            #token.write(creds.to_json())
            token.write(creds)"""

    service = build('drive', 'v2', credentials=creds)
    return service

def load_people(service, fileId,name):
    """
    Function to load info about the researchers.

    Database including information about researchers is stored in
    .csv file. With the path to the file we load the .csv in an
    adequate manner for the software by storing all the information
    in an array.

    Parameters:
    service : service from drive (get_googledrive_service)
    fileId (str): file ID
    name (str): path to write file

    Returns:
    data_researchers (ndarray): array including information about
                                researchers
    """
    data_researchers = []
    if service:
        with open(name, "wb") as csvfile:
            text = service.files().get_media(fileId=fileId).execute() 
            csvfile.write(text)
    
    with open(name, "r", encoding='unicode_escape') as csvfile:
        reader = csv.reader(csvfile, delimiter=';')
        for row in reader:
            if len(row) == 0:
                continue
            data_researchers.append(np.asarray(row))
    data_researchers = np.asarray(data_researchers)
    
    for i in range(data_researchers.shape[0]):
        people = data_researchers[i, :]

        full_name = people[0]
        split_name = full_name.split(", ")
        if len(split_name) == 1:
            split_name = full_name.split(",")
        if len(split_name) == 1:
            continue
        name = split_name[0]
        surname = split_name[1]
        office = people[1]
        building = people[2]
        data_researchers[i, 0] = name
        data_researchers[i, 1] = surname
        data_researchers[i, 2] = office
        data_researchers[i, 3] = building
    return data_researchers


def load_groups(service,fileId,name):
    """
    Function to load info about the research groups.

    Database including information about the groups is stored in
    .csv file. With the path to the file we load the .csv in an
    adequate manner for the software by storing all the information
    in an array.

    Parameters:
    service : service from drive (get_googledrive_service)
    fileId (str): file ID
    name (str): path to write file

    Returns:
    data_groups (ndarray): array including information about groups
    """
    data_groups = []
    if service:
        with open(name, "wb") as csvfile:
            text = service.files().get_media(fileId=fileId).execute() 
            csvfile.write(text)
    with open(name, "r", encoding='unicode_escape') as csvfile:
        reader = csv.reader(csvfile, delimiter=';')
        for row in reader:
            data_groups.append(np.asarray(row))
    data_groups = np.asarray(data_groups)
    data_groups = data_groups[1:, :]
    return data_groups


def load_places(service,fileId,name):
    """
    Function to load info about the buildings.

    Database including information about the buildings is stored in
    .csv file. With the path to the file we load the .csv in an
    adequate manner for the software by storing all the information
    in an array.

    Parameters:
    service : service from drive (get_googledrive_service)
    fileId (str): file ID
    name (str): path to write file

    Returns:
    data_buildings (ndarray): array including information about 
                              buildings
    """

    data_places = []
    if service:
        with open(name, "wb") as csvfile:
            text = service.files().get_media(fileId=fileId).execute() 
            csvfile.write(text)
    with open(name, "r", encoding='unicode_escape') as csvfile:
        reader = csv.reader(csvfile, delimiter=';')
        for row in reader:
            data_places.append(np.asarray(row))
    data_places = np.asarray(data_places)
    data_places = data_places[1:, :]
    return data_places
