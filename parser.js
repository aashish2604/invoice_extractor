const convertJSONtoCSV = require('./json_to_csv_converter');

function findInvoiceNumberInAddress(data){
    let targetIndex=-1;
    let dataArray=data.split(" ");
    for(let i=0;i<dataArray.length;i++){
        let str=dataArray[i];
        if(str === str.toUpperCase()){
            let containsLetters=false;
            let containsNumbers=false;
            for(let j=0;j<str.length;j++){
                if(/^\d$/.test(str[j])) containsNumbers=true;
                if(str[j].toUpperCase()!== str[j].toLowerCase()) containsLetters=true;
            }
            if(containsLetters && containsNumbers) {
                targetIndex=i;
                break;
        }
        }
    }
    return targetIndex;
}

// This function tackles the edge case of very large address elements
function parseBusinessAddress(input,bussinessName){
    let invoiceNumber="";
    input=input.replace(bussinessName,"");
    input=input.replace("Invoice#","");
    input=input.replace("Issue date","");
    let indexOfminusSign;
    for(let i=0;i<input.length;i++){
        if(input[i]==="-"){
            indexOfminusSign=i;
            break;
        }
    }
    let issueDateString=input.substring(indexOfminusSign-2,indexOfminusSign+8);
    let dateParts=issueDateString.split("-");
    let issueDate=new Date(dateParts[2], (dateParts[1] - 1), dateParts[0]);

    let substring1=input.substring(0,indexOfminusSign-2);
    let substring2=input.substring(indexOfminusSign+8);
    let address=substring1+substring2;
    
    let invoiceIndex=findInvoiceNumberInAddress(address);
    if(invoiceIndex!==-1){
        let addressArray=address.split(" ");
        invoiceNumber=addressArray[invoiceIndex].trim();
    }
    address=address.replace(invoiceNumber,"");

    let splittedArray=address.split(",");

    let state=splittedArray[2].trim();
    let lastElement=splittedArray[3].trim();

    const replaced = lastElement.replace(/\D/g, '');

    let zipcode;

    if (replaced !== '') {
    zipcode = Number(replaced);
    }

    let country=lastElement.replace(replaced,"").trim();

    let responseJson={
        "street": splittedArray[0].trim(),
        "city": splittedArray[1].trim(),
        "country": state+", "+country,
        "zipcode": zipcode,
        "issueDate": issueDate,
        "invoiceNumber": invoiceNumber
    };

    console.log(responseJson);

    return responseJson;
}


function getInvoiceNumber(data,bussinessName){
    data=data.replace(bussinessName,"");
    data=data.replace("Invoice#","");
    data=data.replace("Issue date","");
    return data.trim();
}


function parseBillToAndDetails(data){
    let invoiceDescription="";
    if(!data[1].includes("@")){
        let index=1;
        while(index<data.length){
            invoiceDescription+=data[index];
            data.splice(index,1);
            index++;
        }   
    }
    let ind=0;
    while(ind<data.length){
        let str=data[ind];
        if(str[3]==="-" && str[7]==="-")
        break;
        ind++;
    }
    ind+=3;

    for(let j=data.length-1;j>=ind;j--){
        invoiceDescription=data.pop()+invoiceDescription;
    }

    let addressLine2=data.pop().trim();
    let addressLine1=data.pop().trim();
    let phoneNumer=data.pop().trim();
    let name="";
    let email="";

    let i;

    for(i=0;i<data.length;i++){
        let str=data[i];
        if(str.includes("@")) break;
        else{
            name+=str;
        }
    }

    for(let j=i;j<data.length;j++){
        email+=data[j].trim();
    }

    return {
        "name": name.trim(),
        "email": email.trim(),
        "phoneNo": phoneNumer,
        "addressLine1": addressLine1,
        "addressLine2": addressLine2,
        "invoiceDescription": invoiceDescription.trim()
    }
}

function parseBillItemDetails(data){
    let i=0;
    let billItemDetailsJson=[];
    while(i<data.length){
        let currentItemData={
            "Invoice__BillDetails__Name": data[i].trim(),
            "Invoice__BillDetails__Quantity": Number(data[i+1].trim()),
            "Invoice__BillDetails__Rate": Number(data[i+2].trim())
        }
        billItemDetailsJson.push(currentItemData);
        i+=4;
    }
    return billItemDetailsJson;
}





/// Class to extract the required data in form of json from the API response
class Parser{
    collectiveParsedReponse;
    
    constructor(){
        this.collectiveParsedReponse=[];
    }

    // Funciton for taking out relevant info from API response JSON

    parseApiResponse(json) {
        let arialMtBeforeTitle="";
        let arialBeforeTitle="";
        let businessName="";
        let businessDescription="";
        let arialMtBetweenTitleTable=[];
        let invoiceDueDate;
        let itemTableData=[];
        let invoiceTax;
        let invoiceNumber;

        // Index representing traversal position
        let i=0;

        // move until we reach title
        while(i<json.elements.length){
            if(json.elements[i].TextSize === 24.863998413085938) break;
            if(json.elements[i].Font!== undefined && json.elements[i].Font.family_name === "Arial MT")
            arialMtBeforeTitle+=json.elements[i].Text;
            else if(json.elements[i].Font!== undefined && json.elements[i].Font.family_name === "Arial")
            arialBeforeTitle+=json.elements[i].Text;
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
                let dateParts=dueDateString.split("-");
                invoiceDueDate = new Date(dateParts[2], (dateParts[1] - 1), dateParts[0]);
            }
            else if(json.elements[i].Font!== undefined && json.elements[i].Font.family_name === "Arial MT"){
                arialMtBetweenTitleTable.push(json.elements[i].Text);
            }
            i++;
        }

        while(i<json.elements.length){
            if(json.elements[i].Font!== undefined && json.elements[i].Font.family_name === "Arial MT")
            itemTableData.push(json.elements[i].Text.trim());
            i++;
        }
        itemTableData.pop();
        invoiceTax=Number(itemTableData.pop());
        itemTableData.pop();

        invoiceNumber=getInvoiceNumber(arialBeforeTitle,businessName);

        let parsedBusinessAddress=parseBusinessAddress(arialMtBeforeTitle,businessName);
        let parsedBillToAndDetails=parseBillToAndDetails(arialMtBetweenTitleTable);
        let parsedBillItemDetails=parseBillItemDetails(itemTableData);


        // Contains data for all the fields before the item wise bill details of invoice
        let responseFragment1={
          bussiness_city: parsedBusinessAddress.city,
          bussiness_country: parsedBusinessAddress.country,
          businessDescription: businessDescription,
          businessName: businessName,
          business_street: parsedBusinessAddress.street,
          business_zipcode: parsedBusinessAddress.zipcode,
          customerAddressLine1: parsedBillToAndDetails.addressLine1,
          customerAddressLine2: parsedBillToAndDetails.addressLine2,
          customerEmail: parsedBillToAndDetails.email,
          customerName: parsedBillToAndDetails.name,
          customerPhoneNo: parsedBillToAndDetails.phoneNo,
        }

        // Contains data for all the fields after the item wise bill details of invoice 
        let responesFragment2={
          invoiceDescription: parsedBillToAndDetails.invoiceDescription,
          invoiceDueDate: invoiceDueDate,
          invoiceIssueDate: parsedBusinessAddress.issueDate,
          invoiceNumber: invoiceNumber!==""?invoiceNumber:parsedBusinessAddress.invoiceNumber,
          invoiceTax: invoiceTax,
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





const jsonData = {
    "version": {
        "json_export": "187",
        "page_segmentation": "5",
        "schema": "1.1.0",
        "structure": "1.1036.0",
        "table_structure": "5"
    },
    "extended_metadata": {
        "ID_instance": "00 77 07 4B 3B B7 B2 11 0A 00 67 45 8B 6B C6 23 ",
        "ID_permanent": "41 35 20 41 31 20 30 34 20 34 42 20 33 42 20 42 37 20 42 32 20 31 31 20 30 41 20 30 30 20 36 37 20 34 35 20 38 42 20 36 42 20 43 36 20 32 33 20 ",
        "pdf_version": "1.6",
        "pdfa_compliance_level": "",
        "is_encrypted": false,
        "has_acroform": false,
        "is_digitally_signed": false,
        "pdfua_compliance_level": "",
        "page_count": 2,
        "has_embedded_files": false,
        "is_certified": false,
        "is_XFA": false,
        "language": "en-US"
    },
    "elements": [
        {
            "Bounds": [
                76.72799682617188,
                734.4232025146484,
                171.43968200683594,
                743.8782348632812
            ],
            "ClipBounds": [
                76.72799682617188,
                734.4232025146484,
                171.43968200683594,
                743.8782348632812
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "THCNJR+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect/P/Sub",
            "Text": "NearBy Electronics ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "Placement": "Block"
            }
        },
        {
            "Bounds": [
                76.72799682617188,
                721.1031951904297,
                214.52447509765625,
                730.5582427978516
            ],
            "ClipBounds": [
                76.72799682617188,
                721.1031951904297,
                214.52447509765625,
                730.5582427978516
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect/P/Sub[2]",
            "Text": "3741 Glory Road, Jamestown, ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "Placement": "Block"
            }
        },
        {
            "Bounds": [
                76.72799682617188,
                708.1132049560547,
                155.30166625976562,
                717.5682373046875
            ],
            "ClipBounds": [
                76.72799682617188,
                708.1132049560547,
                155.30166625976562,
                717.5682373046875
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect/P/Sub[3]",
            "Text": "Tennessee, USA ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "Placement": "Block"
            }
        },
        {
            "Bounds": [
                76.72799682617188,
                694.7931976318359,
                107.43167114257812,
                704.2482452392578
            ],
            "ClipBounds": [
                76.72799682617188,
                694.7931976318359,
                107.43167114257812,
                704.2482452392578
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect/P/Sub[4]",
            "Text": "38556 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "Placement": "Block"
            }
        },
        {
            "Bounds": [
                499.99000549316406,
                734.4232025146484,
                542.9308013916016,
                743.8782348632812
            ],
            "ClipBounds": [
                499.99000549316406,
                734.4232025146484,
                542.9308013916016,
                743.8782348632812
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "THCNJR+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/H1",
            "Text": "Invoice# ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125,
                "TextAlign": "End"
            }
        },
        {
            "Bounds": [
                363.4600067138672,
                694.7931976318359,
                543.3080749511719,
                730.5582427978516
            ],
            "ClipBounds": [
                363.4600067138672,
                694.7931976318359,
                543.3080749511719,
                730.5582427978516
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/P",
            "Text": "AZ59DLHYBEO1IT3MJ72LGOL4JL1G Issue date 12-05-2023 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 13.125,
                "TextAlign": "End"
            }
        },
        {
            "Bounds": [
                76.72799682617188,
                636.5885620117188,
                295.7052459716797,
                659.9109954833984
            ],
            "ClipBounds": [
                76.72799682617188,
                636.5885620117188,
                295.7052459716797,
                659.9109954833984
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/H1",
            "Text": "NearBy Electronics ",
            "TextSize": 24.863998413085938,
            "attributes": {
                "LineHeight": 29.875
            }
        },
        {
            "Bounds": [
                76.72799682617188,
                620.6132049560547,
                460.8868713378906,
                630.0682373046875
            ],
            "ClipBounds": [
                76.72799682617188,
                620.6132049560547,
                460.8868713378906,
                630.0682373046875
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/P",
            "Text": "We are here to serve you better. Reach out to us in case of any concern or feedbacks. ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125,
                "SpaceAfter": 18
            }
        },
        {
            "Bounds": [
                81.04800415039062,
                501.7431945800781,
                513.0480804443359,
                577.1182403564453
            ],
            "ClipBounds": [
                81.04800415039062,
                501.7431945800781,
                513.0480804443359,
                577.1182403564453
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table",
            "attributes": {
                "BBox": [
                    80.99669999999969,
                    501.73199999998906,
                    558.2169999999751,
                    575.4089999999851
                ],
                "NumCol": 3,
                "NumRow": 6,
                "Placement": "Block",
                "SpaceAfter": 18
            }
        },
        {
            "Bounds": [
                81.04800415039062,
                567.6631927490234,
                122.99087524414062,
                577.1182403564453
            ],
            "ClipBounds": [
                81.04800415039062,
                567.6631927490234,
                122.99087524414062,
                577.1182403564453
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR/TH",
            "attributes": {
                "BBox": [
                    80.99669999999969,
                    566.6489999999758,
                    220.31099999999424,
                    575.4089999999851
                ],
                "BlockAlign": "Before",
                "ColIndex": 0,
                "Height": 8.75,
                "InlineAlign": "Start",
                "RowIndex": 0,
                "Width": 139.375
            }
        },
        {
            "Bounds": [
                81.04800415039062,
                567.6631927490234,
                122.99087524414062,
                577.1182403564453
            ],
            "ClipBounds": [
                81.04800415039062,
                567.6631927490234,
                122.99087524414062,
                577.1182403564453
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "THCNJR+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR/TH/P",
            "Text": "BILL TO ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                240.25999450683594,
                567.6631927490234,
                286.1240692138672,
                577.1182403564453
            ],
            "ClipBounds": [
                240.25999450683594,
                567.6631927490234,
                286.1240692138672,
                577.1182403564453
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR/TH[2]",
            "attributes": {
                "BBox": [
                    220.31099999999424,
                    566.6489999999758,
                    403.903999999995,
                    575.4089999999851
                ],
                "BlockAlign": "Before",
                "ColIndex": 1,
                "Height": 8.75,
                "InlineAlign": "Start",
                "RowIndex": 0,
                "Width": 183.625
            }
        },
        {
            "Bounds": [
                240.25999450683594,
                567.6631927490234,
                286.1240692138672,
                577.1182403564453
            ],
            "ClipBounds": [
                240.25999450683594,
                567.6631927490234,
                286.1240692138672,
                577.1182403564453
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "THCNJR+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR/TH[2]/P",
            "Text": "DETAILS ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                412.8000030517578,
                567.6631927490234,
                464.58103942871094,
                577.1182403564453
            ],
            "ClipBounds": [
                412.8000030517578,
                567.6631927490234,
                464.58103942871094,
                577.1182403564453
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR/TH[3]",
            "attributes": {
                "BBox": [
                    403.903999999995,
                    566.6489999999758,
                    558.2169999999751,
                    575.4089999999851
                ],
                "BlockAlign": "Before",
                "ColIndex": 2,
                "Height": 8.75,
                "InlineAlign": "Start",
                "RowIndex": 0,
                "Width": 154.375
            }
        },
        {
            "Bounds": [
                412.8000030517578,
                567.6631927490234,
                464.58103942871094,
                577.1182403564453
            ],
            "ClipBounds": [
                412.8000030517578,
                567.6631927490234,
                464.58103942871094,
                577.1182403564453
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "THCNJR+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR/TH[3]/P",
            "Text": "PAYMENT ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                81.04800415039062,
                554.6831970214844,
                147.9791259765625,
                564.1382446289062
            ],
            "ClipBounds": [
                81.04800415039062,
                554.6831970214844,
                147.9791259765625,
                564.1382446289062
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR[2]/TD",
            "attributes": {
                "BBox": [
                    80.99669999999969,
                    552.25,
                    220.31099999999424,
                    566.6489999999758
                ],
                "BlockAlign": "Middle",
                "ColIndex": 0,
                "Height": 14.375,
                "InlineAlign": "Start",
                "RowIndex": 1,
                "Width": 139.375
            }
        },
        {
            "Bounds": [
                81.04800415039062,
                554.6831970214844,
                147.9791259765625,
                564.1382446289062
            ],
            "ClipBounds": [
                81.04800415039062,
                554.6831970214844,
                147.9791259765625,
                564.1382446289062
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR[2]/TD/P",
            "Text": "Jill Schowalter ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                240.25999450683594,
                554.6831970214844,
                373.1345520019531,
                564.1382446289062
            ],
            "ClipBounds": [
                240.25999450683594,
                554.6831970214844,
                373.1345520019531,
                564.1382446289062
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR[2]/TD[2]",
            "attributes": {
                "BBox": [
                    220.31099999999424,
                    552.25,
                    403.903999999995,
                    566.6489999999758
                ],
                "BlockAlign": "Middle",
                "ColIndex": 1,
                "Height": 14.375,
                "InlineAlign": "Start",
                "RowIndex": 1,
                "Width": 183.625
            }
        },
        {
            "Bounds": [
                240.25999450683594,
                554.6831970214844,
                373.1345520019531,
                564.1382446289062
            ],
            "ClipBounds": [
                240.25999450683594,
                554.6831970214844,
                373.1345520019531,
                564.1382446289062
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "no",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR[2]/TD[2]/P",
            "Text": "quis officia adipisicing aute ut ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                412.8000030517578,
                554.6831970214844,
                513.0480804443359,
                564.1382446289062
            ],
            "ClipBounds": [
                412.8000030517578,
                554.6831970214844,
                513.0480804443359,
                564.1382446289062
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR[2]/TD[3]",
            "attributes": {
                "BBox": [
                    403.903999999995,
                    552.25,
                    558.2169999999751,
                    566.6489999999758
                ],
                "BlockAlign": "Middle",
                "ColIndex": 2,
                "Height": 14.375,
                "InlineAlign": "Start",
                "RowIndex": 1,
                "Width": 154.375
            }
        },
        {
            "Bounds": [
                412.8000030517578,
                554.6831970214844,
                513.0480804443359,
                564.1382446289062
            ],
            "ClipBounds": [
                412.8000030517578,
                554.6831970214844,
                513.0480804443359,
                564.1382446289062
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR[2]/TD[3]/P",
            "Text": "Due date: 12-06-2023 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                81.04800415039062,
                541.3632049560547,
                203.37879943847656,
                550.8182373046875
            ],
            "ClipBounds": [
                81.04800415039062,
                541.3632049560547,
                203.37879943847656,
                550.8182373046875
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR[3]/TD",
            "attributes": {
                "BBox": [
                    80.99669999999969,
                    540.7299999999814,
                    220.31099999999424,
                    552.25
                ],
                "BlockAlign": "Middle",
                "ColIndex": 0,
                "Height": 11.5,
                "InlineAlign": "Start",
                "RowIndex": 2,
                "Width": 139.375
            }
        },
        {
            "Bounds": [
                81.04800415039062,
                541.3632049560547,
                203.37879943847656,
                550.8182373046875
            ],
            "ClipBounds": [
                81.04800415039062,
                541.3632049560547,
                203.37879943847656,
                550.8182373046875
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR[3]/TD/P",
            "Text": "Jill.Schowalter@gmail.com ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                240.25999450683594,
                541.3632049560547,
                347.2592010498047,
                550.8182373046875
            ],
            "ClipBounds": [
                240.25999450683594,
                541.3632049560547,
                347.2592010498047,
                550.8182373046875
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR[3]/TD[2]",
            "attributes": {
                "BBox": [
                    220.31099999999424,
                    540.7299999999814,
                    403.903999999995,
                    552.25
                ],
                "BlockAlign": "Middle",
                "ColIndex": 1,
                "Height": 11.5,
                "InlineAlign": "Start",
                "RowIndex": 2,
                "Width": 183.625
            }
        },
        {
            "Bounds": [
                240.25999450683594,
                541.3632049560547,
                347.2592010498047,
                550.8182373046875
            ],
            "ClipBounds": [
                240.25999450683594,
                541.3632049560547,
                347.2592010498047,
                550.8182373046875
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR[3]/TD[2]/P",
            "Text": "reprehenderit cillum est ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Path": "//Document/Sect[3]/Table/TR[3]/TD[3]",
            "attributes": {
                "BBox": [
                    403.903999999995,
                    540.7299999999814,
                    558.2169999999751,
                    552.25
                ],
                "BlockAlign": "Before",
                "ColIndex": 2,
                "Height": 11.5,
                "InlineAlign": "Start",
                "RowIndex": 2,
                "Width": 154.375
            }
        },
        {
            "Bounds": [
                81.04800415039062,
                528.0431976318359,
                146.34808349609375,
                537.4982452392578
            ],
            "ClipBounds": [
                81.04800415039062,
                528.0431976318359,
                146.34808349609375,
                537.4982452392578
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR[4]/TD",
            "attributes": {
                "BBox": [
                    80.99669999999969,
                    526.3309999999765,
                    220.31099999999424,
                    540.7299999999814
                ],
                "BlockAlign": "Middle",
                "ColIndex": 0,
                "Height": 14.375,
                "InlineAlign": "Start",
                "RowIndex": 3,
                "Width": 139.375
            }
        },
        {
            "Bounds": [
                81.04800415039062,
                528.0431976318359,
                146.34808349609375,
                537.4982452392578
            ],
            "ClipBounds": [
                81.04800415039062,
                528.0431976318359,
                146.34808349609375,
                537.4982452392578
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR[4]/TD/P",
            "Text": "222-254-5978 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                240.25999450683594,
                528.0431976318359,
                356.4218444824219,
                537.4982452392578
            ],
            "ClipBounds": [
                240.25999450683594,
                528.0431976318359,
                356.4218444824219,
                537.4982452392578
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR[4]/TD[2]",
            "attributes": {
                "BBox": [
                    220.31099999999424,
                    526.3309999999765,
                    403.903999999995,
                    540.7299999999814
                ],
                "BlockAlign": "Middle",
                "ColIndex": 1,
                "Height": 14.375,
                "InlineAlign": "Start",
                "RowIndex": 3,
                "Width": 183.625
            }
        },
        {
            "Bounds": [
                240.25999450683594,
                528.0431976318359,
                356.4218444824219,
                537.4982452392578
            ],
            "ClipBounds": [
                240.25999450683594,
                528.0431976318359,
                356.4218444824219,
                537.4982452392578
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "fr",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR[4]/TD[2]/P",
            "Text": "laboris nisi velit est minim ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                410.63999938964844,
                522.056396484375,
                459.87107849121094,
                532.5244750976562
            ],
            "ClipBounds": [
                410.63999938964844,
                522.056396484375,
                459.87107849121094,
                532.5244750976562
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR[4]/TD[3]",
            "attributes": {
                "BBox": [
                    403.903999999995,
                    501.73199999998906,
                    558.2169999999751,
                    540.7299999999814
                ],
                "BlockAlign": "Before",
                "ColIndex": 2,
                "Height": 39,
                "InlineAlign": "Start",
                "RowIndex": 3,
                "RowSpan": 3,
                "Width": 154.375
            }
        },
        {
            "Bounds": [
                410.63999938964844,
                522.056396484375,
                459.87107849121094,
                532.5244750976562
            ],
            "ClipBounds": [
                410.63999938964844,
                522.056396484375,
                459.87107849121094,
                532.5244750976562
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "THCNJR+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR[4]/TD[3]/P",
            "Text": "$34483.9 ",
            "TextSize": 11.160003662109375,
            "attributes": {
                "LineHeight": 13.375
            }
        },
        {
            "Bounds": [
                81.04800415039062,
                514.7232055664062,
                184.18655395507812,
                524.1782379150391
            ],
            "ClipBounds": [
                81.04800415039062,
                514.7232055664062,
                184.18655395507812,
                524.1782379150391
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR[5]/TD",
            "attributes": {
                "BBox": [
                    80.99669999999969,
                    513.3709999999846,
                    220.31099999999424,
                    526.3309999999765
                ],
                "BlockAlign": "Middle",
                "ColIndex": 0,
                "Height": 13,
                "InlineAlign": "Start",
                "RowIndex": 4,
                "Width": 139.375
            }
        },
        {
            "Bounds": [
                81.04800415039062,
                514.7232055664062,
                184.18655395507812,
                524.1782379150391
            ],
            "ClipBounds": [
                81.04800415039062,
                514.7232055664062,
                184.18655395507812,
                524.1782379150391
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR[5]/TD/P",
            "Text": "68910 Ahmad Centers ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                240.25999450683594,
                514.7232055664062,
                347.54144287109375,
                524.1782379150391
            ],
            "ClipBounds": [
                240.25999450683594,
                514.7232055664062,
                347.54144287109375,
                524.1782379150391
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR[5]/TD[2]",
            "attributes": {
                "BBox": [
                    220.31099999999424,
                    513.3709999999846,
                    403.903999999995,
                    526.3309999999765
                ],
                "BlockAlign": "Middle",
                "ColIndex": 1,
                "Height": 13,
                "InlineAlign": "Start",
                "RowIndex": 4,
                "Width": 183.625
            }
        },
        {
            "Bounds": [
                240.25999450683594,
                514.7232055664062,
                347.54144287109375,
                524.1782379150391
            ],
            "ClipBounds": [
                240.25999450683594,
                514.7232055664062,
                347.54144287109375,
                524.1782379150391
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "pt",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR[5]/TD[2]/P",
            "Text": "commodo pariatur esse ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                81.04800415039062,
                501.7431945800781,
                125.04719543457031,
                511.1982421875
            ],
            "ClipBounds": [
                81.04800415039062,
                501.7431945800781,
                125.04719543457031,
                511.1982421875
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR[6]/TD",
            "attributes": {
                "BBox": [
                    80.99669999999969,
                    501.73199999998906,
                    220.31099999999424,
                    513.3709999999846
                ],
                "BlockAlign": "Middle",
                "ColIndex": 0,
                "Height": 11.625,
                "InlineAlign": "Start",
                "RowIndex": 5,
                "Width": 139.375
            }
        },
        {
            "Bounds": [
                81.04800415039062,
                501.7431945800781,
                125.04719543457031,
                511.1982421875
            ],
            "ClipBounds": [
                81.04800415039062,
                501.7431945800781,
                125.04719543457031,
                511.1982421875
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR[6]/TD/P",
            "Text": "Vilaplana ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                240.25999450683594,
                501.7431945800781,
                350.62591552734375,
                511.1982421875
            ],
            "ClipBounds": [
                240.25999450683594,
                501.7431945800781,
                350.62591552734375,
                511.1982421875
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR[6]/TD[2]",
            "attributes": {
                "BBox": [
                    220.31099999999424,
                    501.73199999998906,
                    403.903999999995,
                    513.3709999999846
                ],
                "BlockAlign": "Middle",
                "ColIndex": 1,
                "Height": 11.625,
                "InlineAlign": "Start",
                "RowIndex": 5,
                "Width": 183.625
            }
        },
        {
            "Bounds": [
                240.25999450683594,
                501.7431945800781,
                350.62591552734375,
                511.1982421875
            ],
            "ClipBounds": [
                240.25999450683594,
                501.7431945800781,
                350.62591552734375,
                511.1982421875
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "fr",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table/TR[6]/TD[2]/P",
            "Text": "deserunt est nostrud qui ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                416.7532043457031,
                530.1510314941406,
                426.20823669433594
            ],
            "ClipBounds": [
                77.447998046875,
                416.7532043457031,
                530.1510314941406,
                426.20823669433594
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[2]",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    401.775999999998,
                    540.9379999999946,
                    434.29499999999825
                ],
                "NumCol": 4,
                "Placement": "Block",
                "SpaceAfter": 18
            }
        },
        {
            "Bounds": [
                77.447998046875,
                416.7532043457031,
                104.47239685058594,
                426.20823669433594
            ],
            "ClipBounds": [
                77.447998046875,
                416.7532043457031,
                104.47239685058594,
                426.20823669433594
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[2]/TR/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    400.93599999998696,
                    358.78499999998894,
                    434.29499999999825
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    [
                        0,
                        0,
                        0
                    ],
                    [
                        0.6235349999999755,
                        0.6235349999999755,
                        0.6235349999999755
                    ],
                    [
                        0,
                        0,
                        0
                    ],
                    [
                        0,
                        0,
                        0
                    ]
                ],
                "BorderStyle": "Solid",
                "BorderThickness": [
                    0.625,
                    0.875,
                    0.5,
                    0.25
                ],
                "ColIndex": 0,
                "Height": 33.375,
                "InlineAlign": "Start",
                "RowIndex": 0,
                "Width": 287.25
            }
        },
        {
            "Bounds": [
                77.447998046875,
                416.7532043457031,
                104.47239685058594,
                426.20823669433594
            ],
            "ClipBounds": [
                77.447998046875,
                416.7532043457031,
                104.47239685058594,
                426.20823669433594
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "THCNJR+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[2]/TR/TD/P",
            "Text": "ITEM ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                363.1000061035156,
                416.7532043457031,
                386.6570281982422,
                426.20823669433594
            ],
            "ClipBounds": [
                363.1000061035156,
                416.7532043457031,
                386.6570281982422,
                426.20823669433594
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[2]/TR/TD[2]",
            "attributes": {
                "BBox": [
                    358.304999999993,
                    400.93599999998696,
                    415.6629999999859,
                    434.29499999999825
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    [
                        0,
                        0,
                        0
                    ],
                    [
                        0.6235349999999755,
                        0.6235349999999755,
                        0.6235349999999755
                    ],
                    [
                        0,
                        0,
                        0
                    ],
                    [
                        0,
                        0,
                        0
                    ]
                ],
                "BorderStyle": "Solid",
                "BorderThickness": [
                    0.625,
                    0.875,
                    0.25,
                    0.25
                ],
                "ColIndex": 1,
                "Height": 33.375,
                "InlineAlign": "Start",
                "RowIndex": 0,
                "Width": 57.375
            }
        },
        {
            "Bounds": [
                363.1000061035156,
                416.7532043457031,
                386.6570281982422,
                426.20823669433594
            ],
            "ClipBounds": [
                363.1000061035156,
                416.7532043457031,
                386.6570281982422,
                426.20823669433594
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "THCNJR+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[2]/TR/TD[2]/P",
            "Text": "QTY ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                416.7532043457031,
                450.7712707519531,
                426.20823669433594
            ],
            "ClipBounds": [
                420.3800048828125,
                416.7532043457031,
                450.7712707519531,
                426.20823669433594
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[2]/TR/TD[3]",
            "attributes": {
                "BBox": [
                    415.18299999999,
                    400.93599999998696,
                    481.8999999999942,
                    434.29499999999825
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    [
                        0,
                        0,
                        0
                    ],
                    [
                        0.6235349999999755,
                        0.6235349999999755,
                        0.6235349999999755
                    ],
                    [
                        0,
                        0,
                        0
                    ],
                    [
                        0,
                        0,
                        0
                    ]
                ],
                "BorderStyle": "Solid",
                "BorderThickness": [
                    0.625,
                    0.875,
                    0.25,
                    0.25
                ],
                "ColIndex": 2,
                "Height": 33.375,
                "InlineAlign": "Start",
                "RowIndex": 0,
                "Width": 66.75
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                416.7532043457031,
                450.7712707519531,
                426.20823669433594
            ],
            "ClipBounds": [
                420.3800048828125,
                416.7532043457031,
                450.7712707519531,
                426.20823669433594
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "THCNJR+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[2]/TR/TD[3]/P",
            "Text": "RATE ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                483.4100036621094,
                416.7532043457031,
                530.1510314941406,
                426.20823669433594
            ],
            "ClipBounds": [
                483.4100036621094,
                416.7532043457031,
                530.1510314941406,
                426.20823669433594
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[2]/TR/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    400.93599999998696,
                    541.417999999976,
                    434.29499999999825
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    [
                        0,
                        0,
                        0
                    ],
                    [
                        0.6235349999999755,
                        0.6235349999999755,
                        0.6235349999999755
                    ],
                    [
                        0,
                        0,
                        0
                    ],
                    [
                        0,
                        0,
                        0
                    ]
                ],
                "BorderStyle": "Solid",
                "BorderThickness": [
                    0.625,
                    0.875,
                    0.25,
                    0.5
                ],
                "ColIndex": 3,
                "Height": 33.375,
                "InlineAlign": "Start",
                "RowIndex": 0,
                "Width": 60
            }
        },
        {
            "Bounds": [
                483.4100036621094,
                416.7532043457031,
                530.1510314941406,
                426.20823669433594
            ],
            "ClipBounds": [
                483.4100036621094,
                416.7532043457031,
                530.1510314941406,
                426.20823669433594
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "THCNJR+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[2]/TR/TD[4]/P",
            "Text": "AMOUNT ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                179.75320434570312,
                517.7280731201172,
                390.54823303222656
            ],
            "ClipBounds": [
                77.447998046875,
                179.75320434570312,
                517.7280731201172,
                390.54823303222656
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    162.62599999999657,
                    540.9379999999946,
                    398.775999999998
                ],
                "NumCol": 4,
                "NumRow": 7,
                "Placement": "Block",
                "SpaceAfter": 18
            }
        },
        {
            "Bounds": [
                77.447998046875,
                381.09320068359375,
                180.91920471191406,
                390.54823303222656
            ],
            "ClipBounds": [
                77.447998046875,
                381.09320068359375,
                180.91920471191406,
                390.54823303222656
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    364.81699999999546,
                    358.0649999999878,
                    398.775999999998
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": [
                    0.625,
                    0.25,
                    0.5,
                    0.25
                ],
                "ColIndex": 0,
                "Height": 34,
                "InlineAlign": "Start",
                "RowIndex": 0,
                "Width": 286.375
            }
        },
        {
            "Bounds": [
                77.447998046875,
                381.09320068359375,
                180.91920471191406,
                390.54823303222656
            ],
            "ClipBounds": [
                77.447998046875,
                381.09320068359375,
                180.91920471191406,
                390.54823303222656
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR/TD/P",
            "Text": "Practical Frozen Chips ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                381.09320068359375,
                378.3000030517578,
                390.54823303222656
            ],
            "ClipBounds": [
                363.82000732421875,
                381.09320068359375,
                378.3000030517578,
                390.54823303222656
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR/TD[2]",
            "attributes": {
                "BBox": [
                    357.58499999999185,
                    364.81699999999546,
                    414.22299999999814,
                    398.775999999998
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": [
                    0.625,
                    0.25,
                    0.25,
                    0.25
                ],
                "ColIndex": 1,
                "Height": 34,
                "InlineAlign": "Start",
                "RowIndex": 0,
                "Width": 56.625
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                381.09320068359375,
                378.3000030517578,
                390.54823303222656
            ],
            "ClipBounds": [
                363.82000732421875,
                381.09320068359375,
                378.3000030517578,
                390.54823303222656
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR/TD[2]/P",
            "Text": "66 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                381.09320068359375,
                434.86000061035156,
                390.54823303222656
            ],
            "ClipBounds": [
                420.3800048828125,
                381.09320068359375,
                434.86000061035156,
                390.54823303222656
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR/TD[3]",
            "attributes": {
                "BBox": [
                    413.74299999998766,
                    364.81699999999546,
                    481.8999999999942,
                    398.775999999998
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": [
                    0.625,
                    0.25,
                    0.25,
                    0.25
                ],
                "ColIndex": 2,
                "Height": 34,
                "InlineAlign": "Start",
                "RowIndex": 0,
                "Width": 68.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                381.09320068359375,
                434.86000061035156,
                390.54823303222656
            ],
            "ClipBounds": [
                420.3800048828125,
                381.09320068359375,
                434.86000061035156,
                390.54823303222656
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR/TD[3]/P",
            "Text": "82 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                381.09320068359375,
                517.7280731201172,
                390.54823303222656
            ],
            "ClipBounds": [
                487.00999450683594,
                381.09320068359375,
                517.7280731201172,
                390.54823303222656
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    364.81699999999546,
                    541.417999999976,
                    398.775999999998
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": [
                    0.625,
                    0.25,
                    0.25,
                    0.5
                ],
                "ColIndex": 3,
                "Height": 34,
                "InlineAlign": "Start",
                "RowIndex": 0,
                "Width": 60
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                381.09320068359375,
                517.7280731201172,
                390.54823303222656
            ],
            "ClipBounds": [
                487.00999450683594,
                381.09320068359375,
                517.7280731201172,
                390.54823303222656
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR/TD[4]/P",
            "Text": "$5412 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                347.5832061767578,
                191.65440368652344,
                357.0382385253906
            ],
            "ClipBounds": [
                77.447998046875,
                347.5832061767578,
                191.65440368652344,
                357.0382385253906
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[2]/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    330.2589999999909,
                    358.0649999999878,
                    365.2969999999914
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": [
                    0.25,
                    0.25,
                    0.5,
                    0.25
                ],
                "ColIndex": 0,
                "Height": 35,
                "InlineAlign": "Start",
                "RowIndex": 1,
                "Width": 286.375
            }
        },
        {
            "Bounds": [
                77.447998046875,
                347.5832061767578,
                191.65440368652344,
                357.0382385253906
            ],
            "ClipBounds": [
                77.447998046875,
                347.5832061767578,
                191.65440368652344,
                357.0382385253906
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[2]/TD/P",
            "Text": "Ergonomic Wooden Shirt ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                347.5832061767578,
                378.3000030517578,
                357.0382385253906
            ],
            "ClipBounds": [
                363.82000732421875,
                347.5832061767578,
                378.3000030517578,
                357.0382385253906
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[2]/TD[2]",
            "attributes": {
                "BBox": [
                    357.58499999999185,
                    330.2589999999909,
                    414.22299999999814,
                    365.2969999999914
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": 0.25,
                "ColIndex": 1,
                "Height": 35,
                "InlineAlign": "Start",
                "RowIndex": 1,
                "Width": 56.625
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                347.5832061767578,
                378.3000030517578,
                357.0382385253906
            ],
            "ClipBounds": [
                363.82000732421875,
                347.5832061767578,
                378.3000030517578,
                357.0382385253906
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[2]/TD[2]/P",
            "Text": "39 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                347.5832061767578,
                434.86000061035156,
                357.0382385253906
            ],
            "ClipBounds": [
                420.3800048828125,
                347.5832061767578,
                434.86000061035156,
                357.0382385253906
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[2]/TD[3]",
            "attributes": {
                "BBox": [
                    413.74299999998766,
                    330.2589999999909,
                    481.8999999999942,
                    365.2969999999914
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": 0.25,
                "ColIndex": 2,
                "Height": 35,
                "InlineAlign": "Start",
                "RowIndex": 1,
                "Width": 68.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                347.5832061767578,
                434.86000061035156,
                357.0382385253906
            ],
            "ClipBounds": [
                420.3800048828125,
                347.5832061767578,
                434.86000061035156,
                357.0382385253906
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[2]/TD[3]/P",
            "Text": "41 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                347.5832061767578,
                517.7280731201172,
                357.0382385253906
            ],
            "ClipBounds": [
                487.00999450683594,
                347.5832061767578,
                517.7280731201172,
                357.0382385253906
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[2]/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    330.2589999999909,
                    541.417999999976,
                    365.2969999999914
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": [
                    0.25,
                    0.25,
                    0.25,
                    0.5
                ],
                "ColIndex": 3,
                "Height": 35,
                "InlineAlign": "Start",
                "RowIndex": 1,
                "Width": 60
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                347.5832061767578,
                517.7280731201172,
                357.0382385253906
            ],
            "ClipBounds": [
                487.00999450683594,
                347.5832061767578,
                517.7280731201172,
                357.0382385253906
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[2]/TD[4]/P",
            "Text": "$1599 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                314.1031951904297,
                178.62095642089844,
                323.55824279785156
            ],
            "ClipBounds": [
                77.447998046875,
                314.1031951904297,
                178.62095642089844,
                323.55824279785156
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[3]/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    297.1399999999994,
                    358.0649999999878,
                    330.73899999998685
                ],
                "BlockAlign": "Before",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": [
                    0.25,
                    0.25,
                    0.5,
                    0.25
                ],
                "ColIndex": 0,
                "Height": 33.625,
                "InlineAlign": "Start",
                "RowIndex": 2,
                "Width": 286.375
            }
        },
        {
            "Bounds": [
                77.447998046875,
                314.1031951904297,
                178.62095642089844,
                323.55824279785156
            ],
            "ClipBounds": [
                77.447998046875,
                314.1031951904297,
                178.62095642089844,
                323.55824279785156
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[3]/TD/P",
            "Text": "Intelligent Fresh Pizza ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                314.1031951904297,
                378.3000030517578,
                323.55824279785156
            ],
            "ClipBounds": [
                363.82000732421875,
                314.1031951904297,
                378.3000030517578,
                323.55824279785156
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[3]/TD[2]",
            "attributes": {
                "BBox": [
                    357.58499999999185,
                    297.1399999999994,
                    414.22299999999814,
                    330.73899999998685
                ],
                "BlockAlign": "Before",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": 0.25,
                "ColIndex": 1,
                "Height": 33.625,
                "InlineAlign": "Start",
                "RowIndex": 2,
                "Width": 56.625
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                314.1031951904297,
                378.3000030517578,
                323.55824279785156
            ],
            "ClipBounds": [
                363.82000732421875,
                314.1031951904297,
                378.3000030517578,
                323.55824279785156
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[3]/TD[2]/P",
            "Text": "71 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                314.1031951904297,
                434.86000061035156,
                323.55824279785156
            ],
            "ClipBounds": [
                420.3800048828125,
                314.1031951904297,
                434.86000061035156,
                323.55824279785156
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[3]/TD[3]",
            "attributes": {
                "BBox": [
                    413.74299999998766,
                    297.1399999999994,
                    481.8999999999942,
                    330.73899999998685
                ],
                "BlockAlign": "Before",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": 0.25,
                "ColIndex": 2,
                "Height": 33.625,
                "InlineAlign": "Start",
                "RowIndex": 2,
                "Width": 68.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                314.1031951904297,
                434.86000061035156,
                323.55824279785156
            ],
            "ClipBounds": [
                420.3800048828125,
                314.1031951904297,
                434.86000061035156,
                323.55824279785156
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[3]/TD[3]/P",
            "Text": "75 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                314.1031951904297,
                517.7280731201172,
                323.55824279785156
            ],
            "ClipBounds": [
                487.00999450683594,
                314.1031951904297,
                517.7280731201172,
                323.55824279785156
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[3]/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    297.1399999999994,
                    541.417999999976,
                    330.73899999998685
                ],
                "BlockAlign": "Before",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": [
                    0.25,
                    0.25,
                    0.25,
                    0.5
                ],
                "ColIndex": 3,
                "Height": 33.625,
                "InlineAlign": "Start",
                "RowIndex": 2,
                "Width": 60
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                314.1031951904297,
                517.7280731201172,
                323.55824279785156
            ],
            "ClipBounds": [
                487.00999450683594,
                314.1031951904297,
                517.7280731201172,
                323.55824279785156
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[3]/TD[4]/P",
            "Text": "$5325 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                280.6031951904297,
                202.712158203125,
                290.05824279785156
            ],
            "ClipBounds": [
                77.447998046875,
                280.6031951904297,
                202.712158203125,
                290.05824279785156
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[4]/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    264.74099999999453,
                    358.0649999999878,
                    297.61999999999534
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": [
                    0.25,
                    0.25,
                    0.5,
                    0.25
                ],
                "ColIndex": 0,
                "Height": 32.875,
                "InlineAlign": "Start",
                "RowIndex": 3,
                "Width": 286.375
            }
        },
        {
            "Bounds": [
                77.447998046875,
                280.6031951904297,
                202.712158203125,
                290.05824279785156
            ],
            "ClipBounds": [
                77.447998046875,
                280.6031951904297,
                202.712158203125,
                290.05824279785156
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[4]/TD/P",
            "Text": "Unbranded Granite Cheese ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                280.6031951904297,
                383.3751983642578,
                290.05824279785156
            ],
            "ClipBounds": [
                363.82000732421875,
                280.6031951904297,
                383.3751983642578,
                290.05824279785156
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[4]/TD[2]",
            "attributes": {
                "BBox": [
                    357.58499999999185,
                    264.74099999999453,
                    414.22299999999814,
                    297.61999999999534
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": 0.25,
                "ColIndex": 1,
                "Height": 32.875,
                "InlineAlign": "Start",
                "RowIndex": 3,
                "Width": 56.625
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                280.6031951904297,
                383.3751983642578,
                290.05824279785156
            ],
            "ClipBounds": [
                363.82000732421875,
                280.6031951904297,
                383.3751983642578,
                290.05824279785156
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[4]/TD[2]/P",
            "Text": "104 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                280.6031951904297,
                434.86000061035156,
                290.05824279785156
            ],
            "ClipBounds": [
                420.3800048828125,
                280.6031951904297,
                434.86000061035156,
                290.05824279785156
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[4]/TD[3]",
            "attributes": {
                "BBox": [
                    413.74299999998766,
                    264.74099999999453,
                    481.8999999999942,
                    297.61999999999534
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": 0.25,
                "ColIndex": 2,
                "Height": 32.875,
                "InlineAlign": "Start",
                "RowIndex": 3,
                "Width": 68.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                280.6031951904297,
                434.86000061035156,
                290.05824279785156
            ],
            "ClipBounds": [
                420.3800048828125,
                280.6031951904297,
                434.86000061035156,
                290.05824279785156
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[4]/TD[3]/P",
            "Text": "82 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                280.6031951904297,
                517.7280731201172,
                290.05824279785156
            ],
            "ClipBounds": [
                487.00999450683594,
                280.6031951904297,
                517.7280731201172,
                290.05824279785156
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[4]/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    264.74099999999453,
                    541.417999999976,
                    297.61999999999534
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": [
                    0.25,
                    0.25,
                    0.25,
                    0.5
                ],
                "ColIndex": 3,
                "Height": 32.875,
                "InlineAlign": "Start",
                "RowIndex": 3,
                "Width": 60
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                280.6031951904297,
                517.7280731201172,
                290.05824279785156
            ],
            "ClipBounds": [
                487.00999450683594,
                280.6031951904297,
                517.7280731201172,
                290.05824279785156
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[4]/TD[4]/P",
            "Text": "$8528 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                247.1031951904297,
                165.325439453125,
                256.55824279785156
            ],
            "ClipBounds": [
                77.447998046875,
                247.1031951904297,
                165.325439453125,
                256.55824279785156
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[5]/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    231.6229999999996,
                    358.0649999999878,
                    265.22099999999045
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": [
                    0.25,
                    0.25,
                    0.5,
                    0.25
                ],
                "ColIndex": 0,
                "Height": 33.625,
                "InlineAlign": "Start",
                "RowIndex": 4,
                "Width": 286.375
            }
        },
        {
            "Bounds": [
                77.447998046875,
                247.1031951904297,
                165.325439453125,
                256.55824279785156
            ],
            "ClipBounds": [
                77.447998046875,
                247.1031951904297,
                165.325439453125,
                256.55824279785156
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[5]/TD/P",
            "Text": "Rustic Rubber Fish ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                247.1031951904297,
                378.3000030517578,
                256.55824279785156
            ],
            "ClipBounds": [
                363.82000732421875,
                247.1031951904297,
                378.3000030517578,
                256.55824279785156
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[5]/TD[2]",
            "attributes": {
                "BBox": [
                    357.58499999999185,
                    231.6229999999996,
                    414.22299999999814,
                    265.22099999999045
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": 0.25,
                "ColIndex": 1,
                "Height": 33.625,
                "InlineAlign": "Start",
                "RowIndex": 4,
                "Width": 56.625
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                247.1031951904297,
                378.3000030517578,
                256.55824279785156
            ],
            "ClipBounds": [
                363.82000732421875,
                247.1031951904297,
                378.3000030517578,
                256.55824279785156
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[5]/TD[2]/P",
            "Text": "66 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                247.1031951904297,
                434.86000061035156,
                256.55824279785156
            ],
            "ClipBounds": [
                420.3800048828125,
                247.1031951904297,
                434.86000061035156,
                256.55824279785156
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[5]/TD[3]",
            "attributes": {
                "BBox": [
                    413.74299999998766,
                    231.6229999999996,
                    481.8999999999942,
                    265.22099999999045
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": 0.25,
                "ColIndex": 2,
                "Height": 33.625,
                "InlineAlign": "Start",
                "RowIndex": 4,
                "Width": 68.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                247.1031951904297,
                434.86000061035156,
                256.55824279785156
            ],
            "ClipBounds": [
                420.3800048828125,
                247.1031951904297,
                434.86000061035156,
                256.55824279785156
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[5]/TD[3]/P",
            "Text": "89 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                247.1031951904297,
                517.7280731201172,
                256.55824279785156
            ],
            "ClipBounds": [
                487.00999450683594,
                247.1031951904297,
                517.7280731201172,
                256.55824279785156
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[5]/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    231.6229999999996,
                    541.417999999976,
                    265.22099999999045
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": [
                    0.25,
                    0.25,
                    0.25,
                    0.5
                ],
                "ColIndex": 3,
                "Height": 33.625,
                "InlineAlign": "Start",
                "RowIndex": 4,
                "Width": 60
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                247.1031951904297,
                517.7280731201172,
                256.55824279785156
            ],
            "ClipBounds": [
                487.00999450683594,
                247.1031951904297,
                517.7280731201172,
                256.55824279785156
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[5]/TD[4]/P",
            "Text": "$5874 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                213.26319885253906,
                161.03135681152344,
                222.71824645996094
            ],
            "ClipBounds": [
                77.447998046875,
                213.26319885253906,
                161.03135681152344,
                222.71824645996094
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[6]/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    197.0639999999985,
                    358.0649999999878,
                    232.10299999999552
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": [
                    0.25,
                    0.25,
                    0.5,
                    0.25
                ],
                "ColIndex": 0,
                "Height": 35,
                "InlineAlign": "Start",
                "RowIndex": 5,
                "Width": 286.375
            }
        },
        {
            "Bounds": [
                77.447998046875,
                213.26319885253906,
                161.03135681152344,
                222.71824645996094
            ],
            "ClipBounds": [
                77.447998046875,
                213.26319885253906,
                161.03135681152344,
                222.71824645996094
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[6]/TD/P",
            "Text": "Tasty Frozen Bike ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                213.26319885253906,
                378.3000030517578,
                222.71824645996094
            ],
            "ClipBounds": [
                363.82000732421875,
                213.26319885253906,
                378.3000030517578,
                222.71824645996094
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[6]/TD[2]",
            "attributes": {
                "BBox": [
                    357.58499999999185,
                    197.0639999999985,
                    414.22299999999814,
                    232.10299999999552
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": 0.25,
                "ColIndex": 1,
                "Height": 35,
                "InlineAlign": "Start",
                "RowIndex": 5,
                "Width": 56.625
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                213.26319885253906,
                378.3000030517578,
                222.71824645996094
            ],
            "ClipBounds": [
                363.82000732421875,
                213.26319885253906,
                378.3000030517578,
                222.71824645996094
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[6]/TD[2]/P",
            "Text": "33 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                213.26319885253906,
                434.86000061035156,
                222.71824645996094
            ],
            "ClipBounds": [
                420.3800048828125,
                213.26319885253906,
                434.86000061035156,
                222.71824645996094
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[6]/TD[3]",
            "attributes": {
                "BBox": [
                    413.74299999998766,
                    197.0639999999985,
                    481.8999999999942,
                    232.10299999999552
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": 0.25,
                "ColIndex": 2,
                "Height": 35,
                "InlineAlign": "Start",
                "RowIndex": 5,
                "Width": 68.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                213.26319885253906,
                434.86000061035156,
                222.71824645996094
            ],
            "ClipBounds": [
                420.3800048828125,
                213.26319885253906,
                434.86000061035156,
                222.71824645996094
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[6]/TD[3]/P",
            "Text": "29 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                213.26319885253906,
                512.3251953125,
                222.71824645996094
            ],
            "ClipBounds": [
                487.00999450683594,
                213.26319885253906,
                512.3251953125,
                222.71824645996094
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[6]/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    197.0639999999985,
                    541.417999999976,
                    232.10299999999552
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": [
                    0.25,
                    0.25,
                    0.25,
                    0.5
                ],
                "ColIndex": 3,
                "Height": 35,
                "InlineAlign": "Start",
                "RowIndex": 5,
                "Width": 60
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                213.26319885253906,
                512.3251953125,
                222.71824645996094
            ],
            "ClipBounds": [
                487.00999450683594,
                213.26319885253906,
                512.3251953125,
                222.71824645996094
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[6]/TD[4]/P",
            "Text": "$957 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                179.75320434570312,
                169.30703735351562,
                189.20823669433594
            ],
            "ClipBounds": [
                77.447998046875,
                179.75320434570312,
                169.30703735351562,
                189.20823669433594
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[7]/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    162.02599999999802,
                    358.0649999999878,
                    197.5439999999944
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": [
                    0.25,
                    0.625,
                    0.5,
                    0.25
                ],
                "ColIndex": 0,
                "Height": 35.5,
                "InlineAlign": "Start",
                "RowIndex": 6,
                "Width": 286.375
            }
        },
        {
            "Bounds": [
                77.447998046875,
                179.75320434570312,
                169.30703735351562,
                189.20823669433594
            ],
            "ClipBounds": [
                77.447998046875,
                179.75320434570312,
                169.30703735351562,
                189.20823669433594
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[7]/TD/P",
            "Text": "Refined Plastic Bike ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                179.75320434570312,
                378.3000030517578,
                189.20823669433594
            ],
            "ClipBounds": [
                363.82000732421875,
                179.75320434570312,
                378.3000030517578,
                189.20823669433594
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[7]/TD[2]",
            "attributes": {
                "BBox": [
                    357.58499999999185,
                    162.02599999999802,
                    414.22299999999814,
                    197.5439999999944
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": [
                    0.25,
                    0.625,
                    0.25,
                    0.25
                ],
                "ColIndex": 1,
                "Height": 35.5,
                "InlineAlign": "Start",
                "RowIndex": 6,
                "Width": 56.625
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                179.75320434570312,
                378.3000030517578,
                189.20823669433594
            ],
            "ClipBounds": [
                363.82000732421875,
                179.75320434570312,
                378.3000030517578,
                189.20823669433594
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[7]/TD[2]/P",
            "Text": "58 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                179.75320434570312,
                434.86000061035156,
                189.20823669433594
            ],
            "ClipBounds": [
                420.3800048828125,
                179.75320434570312,
                434.86000061035156,
                189.20823669433594
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[7]/TD[3]",
            "attributes": {
                "BBox": [
                    413.74299999998766,
                    162.02599999999802,
                    481.8999999999942,
                    197.5439999999944
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": [
                    0.25,
                    0.625,
                    0.25,
                    0.25
                ],
                "ColIndex": 2,
                "Height": 35.5,
                "InlineAlign": "Start",
                "RowIndex": 6,
                "Width": 68.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                179.75320434570312,
                434.86000061035156,
                189.20823669433594
            ],
            "ClipBounds": [
                420.3800048828125,
                179.75320434570312,
                434.86000061035156,
                189.20823669433594
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[7]/TD[3]/P",
            "Text": "63 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                179.75320434570312,
                517.7280731201172,
                189.20823669433594
            ],
            "ClipBounds": [
                487.00999450683594,
                179.75320434570312,
                517.7280731201172,
                189.20823669433594
            ],
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[7]/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    162.02599999999802,
                    541.417999999976,
                    197.5439999999944
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": "Solid",
                "BorderThickness": [
                    0.25,
                    0.625,
                    0.25,
                    0.5
                ],
                "ColIndex": 3,
                "Height": 35.5,
                "InlineAlign": "Start",
                "RowIndex": 6,
                "Width": 60
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                179.75320434570312,
                517.7280731201172,
                189.20823669433594
            ],
            "ClipBounds": [
                487.00999450683594,
                179.75320434570312,
                517.7280731201172,
                189.20823669433594
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Table[3]/TR[7]/TD[4]/P",
            "Text": "$3654 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                99.81320190429688,
                120.4593505859375,
                109.26823425292969
            ],
            "ClipBounds": [
                77.447998046875,
                99.81320190429688,
                120.4593505859375,
                109.26823425292969
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "THCNJR+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Sect/H2",
            "Text": "Subtotal ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125,
                "SpaceAfter": 4.125
            }
        },
        {
            "Bounds": [
                485.92999267578125,
                99.81320190429688,
                522.3792724609375,
                109.26823425292969
            ],
            "ClipBounds": [
                485.92999267578125,
                99.81320190429688,
                522.3792724609375,
                109.26823425292969
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/Sect/P",
            "Text": "$31349 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                702.3531951904297,
                109.73143005371094,
                711.8082427978516
            ],
            "ClipBounds": [
                77.447998046875,
                702.3531951904297,
                109.73143005371094,
                711.8082427978516
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "THCNJR+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 1,
            "Path": "//Document/Sect[3]/Sect/P[2]",
            "Text": "Tax % ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                485.92999267578125,
                702.3531951904297,
                500.4100036621094,
                711.8082427978516
            ],
            "ClipBounds": [
                485.92999267578125,
                702.3531951904297,
                500.4100036621094,
                711.8082427978516
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 1,
            "Path": "//Document/Sect[3]/Sect/P[3]",
            "Text": "10 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                605.1031951904297,
                126.14447021484375,
                614.5582427978516
            ],
            "ClipBounds": [
                77.447998046875,
                605.1031951904297,
                126.14447021484375,
                614.5582427978516
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "THCNJR+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 1,
            "Path": "//Document/Sect[3]/Sect[2]/H2",
            "Text": "Total Due ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                485.92999267578125,
                602.8099975585938,
                526.1329956054688,
                611.2519989013672
            ],
            "ClipBounds": [
                485.92999267578125,
                602.8099975585938,
                526.1329956054688,
                611.2519989013672
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EIKBHV+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 1,
            "Path": "//Document/Sect[3]/Sect[2]/P",
            "Text": "$34483.9 ",
            "TextSize": 9,
            "attributes": {
                "LineHeight": 10.75,
                "TextAlign": "End"
            }
        }
    ],
    "pages": [
        {
            "boxes": {
                "CropBox": [
                    0,
                    0,
                    612,
                    792
                ],
                "MediaBox": [
                    0,
                    0,
                    612,
                    792
                ]
            },
            "height": 792,
            "is_scanned": false,
            "page_number": 0,
            "rotation": 0,
            "width": 612
        },
        {
            "boxes": {
                "CropBox": [
                    0,
                    0,
                    612,
                    792
                ],
                "MediaBox": [
                    0,
                    0,
                    612,
                    792
                ]
            },
            "height": 792,
            "is_scanned": false,
            "page_number": 1,
            "rotation": 0,
            "width": 612
        }
    ]
};

// let parser=new Parser();
// parser.parseApiResponse(jsonData);
// console.log(parser.collectiveParsedReponse);