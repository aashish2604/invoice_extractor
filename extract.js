const PDFServicesSdk = require("@adobe/pdfservices-node-sdk");
const fs = require("fs");
const AdmZip = require("adm-zip");
const Parser = require("./parser");
const converter = require("json-2-csv");


function sortStringArrayByNumericValue(strings) {
  const numericSort = (a, b) => {
    const numericA = parseInt(a.match(/\d+/)[0]);
    const numericB = parseInt(b.match(/\d+/)[0]);
    return numericA - numericB;
  };

  return strings.sort(numericSort);
}

const API_OUTPUT_DIRECTORY="./outputs/api_response";

const credentials =
  PDFServicesSdk.Credentials.serviceAccountCredentialsBuilder()
    .fromFile("pdfservices-api-credentials.json")
    .build();

// Create an ExecutionContext using credentials
const executionContext = PDFServicesSdk.ExecutionContext.create(credentials);

///////

const INPUT_DIRECTORY = "./inputs";

let fileNames = fs.readdirSync(INPUT_DIRECTORY);
sortStringArrayByNumericValue(fileNames);

const parser = new Parser();

async function parseDocuments() {
  for (const itr in fileNames) {

    const fileName = fileNames[itr];
    const fileNameWithoutExtension=fileName.split(".")[0];
    const FILEPATH = INPUT_DIRECTORY + "/" + fileName;

    const API_OUTPUT_PATH = API_OUTPUT_DIRECTORY+"/ExtractedTextFrom";
    const OUTPUT_ZIP = API_OUTPUT_PATH + fileNameWithoutExtension + ".zip";

    if(fs.existsSync(OUTPUT_ZIP)) fs.unlinkSync(OUTPUT_ZIP);

    // Create a new operation instance.
    const extractPDFOperation = PDFServicesSdk.ExtractPDF.Operation.createNew(),
      input = PDFServicesSdk.FileRef.createFromLocalFile(
        FILEPATH,
        PDFServicesSdk.ExtractPDF.SupportedSourceFormat.pdf
      );

    // Build extractPDF options
    const options =
      new PDFServicesSdk.ExtractPDF.options.ExtractPdfOptions.Builder()
        .addElementsToExtract(
          PDFServicesSdk.ExtractPDF.options.ExtractElementType.TEXT
        )
        .build();

    extractPDFOperation.setInput(input);
    extractPDFOperation.setOptions(options);

    await extractPDFOperation
      .execute(executionContext)
      .then((result) => result.saveAsFile(OUTPUT_ZIP))
      .then(() => {
        console.log(`\nSuccessfully extracted data from ${fileName} ✔\n`);
        let zip = new AdmZip(OUTPUT_ZIP);
        let jsondata = zip.readAsText("structuredData.json");

        let data = JSON.parse(jsondata);
        parser.parseApiResponse(data);
      })
      .catch((err) => console.log(err));
  }
}

parseDocuments().then(()=>{
    const csvFilePath="outputs/ExtractedData.csv";

    if(fs.existsSync(csvFilePath)) fs.unlinkSync(csvFilePath);

    converter.json2csv(parser.collectiveParsedReponse).then((response)=>{
        fs.writeFile(csvFilePath, response, "utf-8", (err) => {
            if (err) console.log(err);
            else console.log(`\nHurray....Data is saved in ${csvFilePath} ✔✔\n`);
          });
    })

    
});

// Execute the operation
