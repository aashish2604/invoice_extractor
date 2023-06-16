
const parsingHelpers = require('./helper_function');

/// Class to extract the required data in form of json from the API response
class Parser{
    collectiveParsedReponse;
    
    constructor(){
        this.collectiveParsedReponse=[];
    }

    // Funciton for taking out relevant info from API response JSON
    parseApiResponse(json) {
        let businessName="";
        let businessDescription="";
        let invoiceDueDate;
        let itemTableData=[];
        let invoiceTax=10;

        let customerDetailsString="";
        let invoiceDescriptionString="";

        let businessAddressText="";
        let invoiceNumberAndIssueDateString="";

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

        businessName=json.elements[i].Text.trim();
        i++

        // searching for bussiness decription
        while(i<json.elements.length){
            if(json.elements[i].Text === "BILL TO ") break;
            if(json.elements[i].Font!== undefined && json.elements[i].Font.family_name === "Arial MT"){
                businessDescription=json.elements[i].Text;
            }
            i++;
        }
        businessDescription=businessDescription.trim();

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
                if(json.elements[i].Bounds[0]<100){
                    customerDetailsString+=json.elements[i].Text;
                }
                else if(json.elements[i].Bounds[0]>100 && json.elements[i].Bounds[0]<300){
                    invoiceDescriptionString+=json.elements[i].Text;
                }


            }
            i++;
        }
        invoiceDescriptionString=invoiceDescriptionString.replace("DETAILS ","");
        console.log(invoiceDescriptionString);

        while(i<json.elements.length){
            if(json.elements[i].Text!==undefined && json.elements[i].Text.startsWith("Subtotal")) break;
            if(json.elements[i].Font!== undefined && json.elements[i].Font.family_name === "Arial MT")
            itemTableData.push(json.elements[i].Text.trim());
            i++;
        }

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
