
const parsingHelpers = require('./helper_function');

/// Class to extract the required data in form of json from the API response
class Parser{
    collectiveParsedReponse;
    
    constructor(){
        this.collectiveParsedReponse=[];
    }

    // Funciton for taking out relevant info from API response JSON
    parseApiResponse(json) {
        let businessName=""; // Stores business Name
        let businessDescription=""; // Stores business description
        let invoiceDueDate; // Store due date of invoice
        let itemTableData=[]; // Stores the list of bill items for conversion into JSON
        let invoiceTax=10; // Stores tax %. NOTE: This is not hardcoded value but just initial value. Logic is present from line 84

        let customerDetailsString=""; // Stores the string under the "BILL TO" section of the pdf
        let invoiceDescriptionString=""; // Stores the string undet the "DETAILS" section of the pdf

        let businessAddressText=""; // Stores the business address as a combined string for parsing input
        let invoiceNumberAndIssueDateString=""; // Store the combined string having invoice no and issue date

        // Index representing traversal position
        let i=0;

        // move until we reach title
        while(i<json.elements.length){
            if(json.elements[i].TextSize === 24.863998413085938) break;
            if(json.elements[i].Bounds[0]<100 && json.elements[i].Font!== undefined && json.elements[i].Font.family_name === "Arial MT")
            businessAddressText+=json.elements[i].Text;
            else if(json.elements[i].Bounds[0]>200)
            invoiceNumberAndIssueDateString+=json.elements[i].Text;
            i++;
        } 

        // Title is the business name
        businessName=json.elements[i].Text.trim();
        i++

        // move until we get the string "BILL TO"
        while(i<json.elements.length){
            if(json.elements[i].Text === "BILL TO ") break;
            if(json.elements[i].Font!== undefined && json.elements[i].Font.family_name === "Arial MT"){
                businessDescription=json.elements[i].Text;
            }
            i++;
        }
        // The text between title and "BILL TO" us business description
        businessDescription=businessDescription.trim();

        // move the string "AMOUNT" is found
        while(i<json.elements.length){
            if(json.elements[i].Text === "AMOUNT ") break;
            if(json.elements[i].Text !== undefined && json.elements[i].Text.startsWith("Due date:")){
                
                let dueDateString = json.elements[i].Text.trim();
                dueDateString = dueDateString.replace("Due date:","").trim();
                // let dateParts=dueDateString.split("-");
                // invoiceDueDate = new Date(dateParts[2], (dateParts[1] - 1), dateParts[0]);
                invoiceDueDate=dueDateString;
            }
            else if(json.elements[i].Font!== undefined && json.elements[i].Font.family_name === "Arial MT"){
                if(json.elements[i].Bounds[0]<100){ // The left column
                    customerDetailsString+=json.elements[i].Text;
                }
                else if(json.elements[i].Bounds[0]>100 && json.elements[i].Bounds[0]<300){ // The right Column
                    invoiceDescriptionString+=json.elements[i].Text;
                }


            }
            i++;
        }
        // Remove the string "DETAILS " from invoice description if present
        invoiceDescriptionString=invoiceDescriptionString.replace("DETAILS ","");

        // Move until you find a sting beginning with "Subtotal". This is done to get the table data
        while(i<json.elements.length){
            if(json.elements[i].Text!==undefined && json.elements[i].Text.startsWith("Subtotal")) break;
            if(json.elements[i].Font!== undefined && json.elements[i].Font.family_name === "Arial MT")
            itemTableData.push(json.elements[i].Text.trim());
            i++;
        }

        // Move until the end to get the tax %
        while(i<json.elements.length){
            if(json.elements[i].Font!== undefined && json.elements[i].Font.family_name === "Arial MT"){
                let str=json.elements[i].Text;
                str=str.replace("Tax %","").trim();
                let integerVal=Number(str);
                if(integerVal!==NaN && integerVal<100)
                invoiceTax=integerVal;
            }
            i++;
        }

        

        // Using the some of the above strings and parsing functions in helper module to get data in desired form
        let parsedBillItemDetails=parsingHelpers.parseBillItemDetails(itemTableData);
        let parsedCustomerDetails=parsingHelpers.parseCustomerDetails(customerDetailsString);
        let parsedInvoiceNumberAndIssueDate=parsingHelpers.parseInvoiceNumberAndIssueDate(invoiceNumberAndIssueDateString);
        let parsedBusinessAddress=parsingHelpers.parseBusinessAddress(businessAddressText);

        // Contains data for all the fields before the item wise bill details of invoice
        let responseFragment1={
            Bussiness__City: parsedBusinessAddress.city,
            Bussiness__Country: parsedBusinessAddress.country,
            Bussiness__Description: businessDescription.trim(),
            Bussiness__Name: businessName,
            Bussiness__StreetAddress: parsedBusinessAddress.street,
            Bussiness__Zipcode: parsedBusinessAddress.zipcode,
            Customer__Address__line1: parsedCustomerDetails.addressLine1,
            Customer__Address__line2: parsedCustomerDetails.addressLine2,
            Customer__Email: parsedCustomerDetails.email,
            Customer__Name: parsedCustomerDetails.name,
            Customer__PhoneNumber: parsedCustomerDetails.phoneNo,
        }

        // Contains data for all the fields after the item wise bill details of invoice 
        let responesFragment2={
            Invoice__Description: invoiceDescriptionString.trim(),
            Invoice__DueDate: invoiceDueDate,
            Invoice__IssueDate: parsedInvoiceNumberAndIssueDate.issueDate,
            Invoice__Number: parsedInvoiceNumberAndIssueDate.invoiceNumber,
            Invoice__Tax: invoiceTax,
        }

        // NOTE: The fragments above are the properties common for all the items in the invoice

        // Merging fragment1 and fragment2 with the item property in the fashion
        // fragment1 + itemPropery('element' in this case) + fragment2
        parsedBillItemDetails.forEach(element => {
            let indivdualItemResponse={
                ...responseFragment1,
                ...element,
                ...responesFragment2
            };
            this.collectiveParsedReponse.push(indivdualItemResponse);
        });

    }

}

module.exports = Parser;
