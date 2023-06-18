# TASK STATUS
The input data set of the problem statement in present in "inputs" and its corresponding output is present in "outputs/ExtractedData.csv". The api responses for each file is present in "outputs/api_response".

# NODE MODULES USED
Adobe extract Api
```javascript
npm i @adobe/pdfservices-node-sdk
```
json-2-csv
```javascript
npm install json-2-csv
```
ADM-ZIP
```javascript
npm i adm-zip
```
Node fs (File System)

# **STEPS TO RUN CODE**

NOTE - A nodes of version greater than V14 is required to run this project.
The node modules are included in the respository.

### Step 0
Empty the directory "/outputs/api_response". **NOTE:** Do not delete the whole "outputs" folder.\
This is not a necessary step but you are insisted to do this if your input file names are clashing with the ones already present here. If this condition arises then the new output zip file for that particular input will replace the existing one.\
However this won't have any undesirable affect on the final CSV.

### Step 1
Replace the existing files in the "inputs" directory with your input files.\
NOTE: Before proceeding to the next step, if you are having "ExtractedData.csv" file open/running in any of your tabs in your local machine then you are advised to close this otherwise some inevitable error may be thrown by the OS becuase it generally prevents performing write operations on running file.

### Step 2
Inside your teminal change your directory to the root of the project and enter the following command
```javascript
node extract.js
```

### Step 3
Wait for the output generation. You may see file wise progress in the terminal after you hit the above command.

### Step 4
View the final CSV file in "outputs/ExtractedData.csv".

# MY IMPLEMENTATION
The process used can be divided into 2 parts. 
* Fetching the API Response for each input file 
* Extracting required data from the JSON response of the API call

## Fetching API response
In this stage we interate through all the files of the "input" directory and make the call for the Adobe Extract API.\
To make the API call we first create the credentials object and define the execution context. After this fetch the names of all files inside the directory and sort them. We then create an instance of Parser(), which will be used by us later. Now we traverse through all the files inside our directory one by one, define output zip file for each and make the API call. The resposnse for each is sent in form of JSON to the instance of Parser() which stores the desired output.

## PARSING API RESPONSE
The working mechanism here can also be divided into 2 steps:

### SEGREGATING DATA
We traverse through the "elements" of the API response object and extract the data useful to us.\
This is done in a section-wise fashion.
* First we interate until we find the heading. The data upto here is divided into 2 parts on the basis of "Bounds" and "Font". The data mentioned here is not a JSON until now. It is 2 large strings
* Then we move until we extract the business description.
* For the section between the title and the bill items. We iterate and store all the "Text" required on the basis of "Font" and "Bounds". Here also, we make use of 2 large strings. One for the customer details and another for invoice description. The invoice due date is extraced while traversal.
* We move further and traverse the whole bill item details table and store the data into a List of strings on the basis of their "Font".
* For the remaining part of the pdf we only need to extract tax percentage value. Hence we move until the end and do parsing of string and apply the condition to track and store the value

### PARSING SEGREGATED DATA
We use the data segregated for each section and parse them individually using seperate helper functions defined for each of them.
* For business address we use send the string for the whole section (top-LHS) constructed above to its helper function and extract data in desired JSON form using commas as seperator and few additional conditions
* For invoice number and issue data we again send the string for this section (top-RHS) to its heloer function where data is returned in JSON form by splitting the string using blankspace and applying some additional conditions.
* For the section between title and table we send all the data under "BILL TO " as a combined string for this section to its helper method where blank space is used as a seperator and some extra conditions are used to return the parsed data in JSON form.
* For the table we have a helper function which accepts an array of strings and returns a list of objects where each object correspond to data for each row of the table.

Finally all the different JSONs are combined into a single for JSON, which is output for the particular pdf in the desired format. This output is stored inside the instance member of the Parser() object created earlier. This instance of Parser() is common for all the input hence their data is aggragated inside the instance member in the desired format. Not having multilple instances saves a lot of time which would otherwise be lost for creating new copies and storing data into seperate variables.\
After we have iterated through all the files, our Parser() object contains the combined JSON for the input data set.\
We finally convert this JSON into CSV and store it in the "outputs" directory as our ultimate result.
