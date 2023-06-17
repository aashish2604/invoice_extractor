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
Empty the directory "/outputs/api_response" .\
DO NOT DELETE THE DIRECTORY JUST DELETE ITS FILES.\
This is not a necessary step but you are insisted to do this if your input file names are clashing with the ones already present here.

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

