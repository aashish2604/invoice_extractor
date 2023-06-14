const PDFServicesSdk = require('@adobe/pdfservices-node-sdk');
const fs = require('fs');
const AdmZip = require('adm-zip');

const OUTPUT_ZIP = './ExtractTextInfoFromPDF.zip';

//Remove if the output already exists.
if(fs.existsSync(OUTPUT_ZIP)) fs.unlinkSync(OUTPUT_ZIP);

const INPUT_PDF = './output0.pdf';

const credentials = PDFServicesSdk.Credentials
        .serviceAccountCredentialsBuilder()
        .fromFile('pdfservices-api-credentials.json')
        .build();

// Create an ExecutionContext using credentials
const executionContext = PDFServicesSdk.ExecutionContext.create(credentials);

// Create a new operation instance.
const extractPDFOperation = PDFServicesSdk.ExtractPDF.Operation.createNew(),
    input = PDFServicesSdk.FileRef.createFromLocalFile(
        INPUT_PDF, 
        PDFServicesSdk.ExtractPDF.SupportedSourceFormat.pdf
    );

// Build extractPDF options
const options = new PDFServicesSdk.ExtractPDF.options.ExtractPdfOptions.Builder()
        .addElementsToExtract(PDFServicesSdk.ExtractPDF.options.ExtractElementType.TEXT).build()


extractPDFOperation.setInput(input);
extractPDFOperation.setOptions(options);

// Execute the operation
extractPDFOperation.execute(executionContext)
    .then(result => result.saveAsFile(OUTPUT_ZIP))
    .then(() => {
        console.log('Successfully extracted information from PDF. Printing H1 Headers:\n');
        let zip = new AdmZip(OUTPUT_ZIP);
        let jsondata = zip.readAsText('structuredData.json');
        let data = JSON.parse(jsondata);
        data.elements.forEach(element => {
            if(element.Path.endsWith('/H1')) {
                console.log(element.Text);
            }
        });

    })
    .catch(err => console.log(err));

    //parsing the recieved data
    function parseResponseJson(jsonData){
        var data={
            "Bussiness__City": jsonData,
            "Bussiness__Country": jsonData,
            "Bussiness__Description": jsonData.elements[8].text,
            "Bussiness__Name": jsonData.elements[7].text,
            "Bussiness__StreetAddress": jsonData,
            "Bussiness__Zipcode": jsonData.element[3].text,
            "Customer__Address__line1": jsonData,
            "Customer__Address__line2": jsonData,
            "Customer__Email": jsonData.elements[11].text,
            "Customer__Name": jsonData.elements[10].text,
            "Customer__PhoneNumber": jsonData,
            "Invoice__BillDetails__Name": jsonData,
            "Invoice__BillDetails__Quantity": jsonData,
            "Invoice__BillDetails__Rate": jsonData,
            "Invoice__Description": jsonData,
            "Invoice__DueDate": jsonData,
            "Invoice__IssueDate": jsonData.elements[6].text,
            "Invoice__Number": jsonData.elements[4].text,
            "Invoice__Tax": jsonData,
        }

        return data;
    }