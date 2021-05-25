## DriveAPI

This program was written to perform google drive cloud storage management operations.
Its functionality focuses more on excel and google sheets file format
Google sheet files will be downloaded as ms excel files by default

# Set Up

- Use the email address for the google drive you wish to connect the api to to create a
  google cloud platform account if you dont have one yet
- Create a new project for this program
- Navigate to APIs & Services then click +ENABLE APIS AND SERVICES
- Search for Google Drive API and click then Enable API
- Navigate back to APIs & Services page and click on Credentials
- Then click +CREATE CREDENTIALS then OAuth Client ID
- Then fill the form like so:
  - Application type = Web application
  - Name = <anything you want>
- Click Create
- You should get a pop up with client id, ignore
- You should be on the Credentials page now and will see yout newly created credential
  under OAuth 2.0 Client IDs
- Download your credentials file with the download icon on the far right

# Run Project

- Rename the json credentials file as credentials.json and place it in the program folder
- Install node js v14.16.0 . If u have already installed then skip this step
- open terminal in VSCode and run command npm install just for the first time
- Then run with the command npm start
- Then go open your browser and paste this url http://localhost:5000/api/v1/
- Login with your google account and after login it will redirect u to this url http://localhost:5000/api/v1/list
- Now u r all set to use the api go through the documentation link below
- https://documenter.getpostman.com/view/11938461/TzRYbiz5 and choose the language in documentation as per your choice if
  u want to use axios then choose Node JS axios from the Language dropdown menu
