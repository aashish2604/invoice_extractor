const PDFServicesSdk = require("@adobe/pdfservices-node-sdk");
const fs = require("fs");
const AdmZip = require("adm-zip");
const Parser = require("./utilities/parser");
const converter = require("json-2-csv");
const sorter = require("./utilities/helper_function");

const API_OUTPUT_DIRECTORY = "./outputs/api_response";

const credentials =
  PDFServicesSdk.Credentials.serviceAccountCredentialsBuilder()
    .fromFile("pdfservices-api-credentials.json")
    .build();

// Create an ExecutionContext using credentials
const executionContext = PDFServicesSdk.ExecutionContext.create(credentials);

const INPUT_DIRECTORY = "./inputs";

// Get the names of all the files in the INPUT_DIRECTORY
let fileNames = fs.readdirSync(INPUT_DIRECTORY);
// sorting the filenames using helper function
sorter.sortFileNames(fileNames);

// Instance of the Parser class defined in "./utlities"
// The same instance is used for all the files to obtain a single JSON as an output
const parser = new Parser();

async function parseDocuments() {
  for (const itr in fileNames) {
    const fileName = fileNames[itr];
    const fileNameWithoutExtension = fileName.split(".")[0];
    const FILEPATH = INPUT_DIRECTORY + "/" + fileName;

    const API_OUTPUT_PATH = API_OUTPUT_DIRECTORY + "/ExtractedTextFrom";
    const OUTPUT_ZIP = API_OUTPUT_PATH + fileNameWithoutExtension + ".zip";

    if (fs.existsSync(OUTPUT_ZIP)) fs.unlinkSync(OUTPUT_ZIP); // Remove the zip file if it already exists to prevent duplicacy

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

    // start execution for this file
    await extractPDFOperation
      .execute(executionContext)
      .then((result) => result.saveAsFile(OUTPUT_ZIP))
      .then(() => {
        let zip = new AdmZip(OUTPUT_ZIP);
        let jsondata = zip.readAsText("structuredData.json");

        let data = JSON.parse(jsondata);
        parser.parseApiResponse(data);
        console.log(`\nSuccessfully extracted data from ${fileName} ✔\n`);
      })
      .catch((err) => console.log(err));
  }
}

// making asynchronous function call to begin the process
parseDocuments().then(() => {
  const csvFilePath = "outputs/ExtractedData.csv";

  if (fs.existsSync(csvFilePath)) fs.unlinkSync(csvFilePath); // replace the existing output file if it exists

  // convert the output JSON to CSV
  converter.json2csv(parser.collectiveParsedReponse).then((response) => {
    // write the file to the storage
    fs.writeFile(csvFilePath, response, "utf-8", (err) => {
      if (err) console.log(err);
      else console.log(`\nAll Done 👍....Data is saved in ${csvFilePath} ✔✔\n`);
    });
  });
});
