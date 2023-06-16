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

    for(let j=data.length-1;j>=ind+3;j--){
        invoiceDescription=data.pop()+invoiceDescription;
    }

    console.log(data);

    let tempStr="";
    while(ind<data.length){
        tempStr=data.pop()+tempStr;
    }

    let tempStrArray=tempStr.trim().split(" ");

    console.log(tempStrArray);

    let phoneNumer=tempStrArray.shift().trim();
    let addressLine1Fragment1=tempStrArray.shift();
    let addressLine1Fragment2=tempStrArray.shift();
    let addressLine1Fragment3=tempStrArray.shift();
    let addressLine1=addressLine1Fragment1+" "+addressLine1Fragment2+" "+addressLine1Fragment3;
    let addressLine2="";
    let name="";
    let email="";

    while(tempStrArray.length>0){
        addressLine2+=tempStrArray.shift()+" ";
    }

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
        "phoneNo": phoneNumer.trim(),
        "addressLine1": addressLine1.trim(),
        "addressLine2": addressLine2.trim(),
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
        "ID_instance": "92 3E 76 89 3E B7 B2 11 0A 00 67 45 8B 6B C6 23 ",
        "ID_permanent": "31 39 20 44 46 20 37 33 20 38 39 20 33 45 20 42 37 20 42 32 20 31 31 20 30 41 20 30 30 20 36 37 20 34 35 20 38 42 20 36 42 20 43 36 20 32 33 20 ",
        "pdf_version": "1.6",
        "pdfa_compliance_level": "",
        "is_encrypted": false,
        "has_acroform": false,
        "is_digitally_signed": false,
        "pdfua_compliance_level": "",
        "page_count": 1,
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
                "name": "DFYGRN+Arial-BoldMT",
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
                "name": "OGLUPR+ArialMT",
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
                "name": "OGLUPR+ArialMT",
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
                "name": "OGLUPR+ArialMT",
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
                361.6600036621094,
                721.1031951904297,
                543.1300811767578,
                730.5582427978516
            ],
            "ClipBounds": [
                361.6600036621094,
                721.1031951904297,
                543.1300811767578,
                730.5582427978516
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "DFYGRN+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect/P[2]/Sub",
            "Text": "Invoice# SE1605804413837873518350 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "Placement": "Block"
            }
        },
        {
            "Bounds": [
                491.3300018310547,
                708.1132049560547,
                543.2117614746094,
                717.5682373046875
            ],
            "ClipBounds": [
                491.3300018310547,
                708.1132049560547,
                543.2117614746094,
                717.5682373046875
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "DFYGRN+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect/P[2]/Sub[2]",
            "Text": "Issue date ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "Placement": "Block"
            }
        },
        {
            "Bounds": [
                489.1699981689453,
                694.7931976318359,
                543.3080749511719,
                704.2482452392578
            ],
            "ClipBounds": [
                489.1699981689453,
                694.7931976318359,
                543.3080749511719,
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
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect/P[2]/Sub[3]",
            "Text": "12-05-2023 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "Placement": "Block"
            }
        },
        {
            "Bounds": [
                76.72799682617188,
                649.9085540771484,
                295.7052459716797,
                673.2309875488281
            ],
            "ClipBounds": [
                76.72799682617188,
                649.9085540771484,
                295.7052459716797,
                673.2309875488281
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/Title",
            "Text": "NearBy Electronics ",
            "TextSize": 24.863998413085938,
            "attributes": {
                "LineHeight": 29.875,
                "SpaceAfter": 7
            }
        },
        {
            "Bounds": [
                76.72799682617188,
                633.9331970214844,
                460.8868713378906,
                643.3882446289062
            ],
            "ClipBounds": [
                76.72799682617188,
                633.9331970214844,
                460.8868713378906,
                643.3882446289062
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/P[3]",
            "Text": "We are here to serve you better. Reach out to us in case of any concern or feedbacks. ",
            "TextSize": 10.080001831054688
        },
        {
            "Bounds": [
                81.04800415039062,
                580.9832000732422,
                122.99087524414062,
                590.438232421875
            ],
            "ClipBounds": [
                81.04800415039062,
                580.9832000732422,
                122.99087524414062,
                590.438232421875
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "DFYGRN+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/P[4]",
            "Text": "BILL TO ",
            "TextSize": 10.080001831054688
        },
        {
            "Bounds": [
                81.04800415039062,
                567.6631927490234,
                155.27711486816406,
                577.1182403564453
            ],
            "ClipBounds": [
                81.04800415039062,
                567.6631927490234,
                155.27711486816406,
                577.1182403564453
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect/P[5]/Sub",
            "Text": "Garry Hegmann ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "Placement": "Block"
            }
        },
        {
            "Bounds": [
                81.04800415039062,
                554.6831970214844,
                207.05807495117188,
                564.1382446289062
            ],
            "ClipBounds": [
                81.04800415039062,
                554.6831970214844,
                207.05807495117188,
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
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect/P[5]/Sub[2]",
            "Text": "Garry_Hegmann59@hotma ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "Placement": "Block"
            }
        },
        {
            "Bounds": [
                81.04800415039062,
                541.3632049560547,
                110.21943664550781,
                550.8182373046875
            ],
            "ClipBounds": [
                81.04800415039062,
                541.3632049560547,
                110.21943664550781,
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
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect/P[5]/Sub[3]",
            "Text": "il.com ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "Placement": "Block"
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
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect/P[5]/Sub[4]",
            "Text": "750-257-9345 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "Placement": "Block"
            }
        },
        {
            "Bounds": [
                81.04800415039062,
                514.7232055664062,
                161.7283172607422,
                524.1782379150391
            ],
            "ClipBounds": [
                81.04800415039062,
                514.7232055664062,
                161.7283172607422,
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
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect/P[5]/Sub[5]",
            "Text": "9874 Bayer Road ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "Placement": "Block"
            }
        },
        {
            "Bounds": [
                81.04800415039062,
                501.7431945800781,
                121.08575439453125,
                511.1982421875
            ],
            "ClipBounds": [
                81.04800415039062,
                501.7431945800781,
                121.08575439453125,
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
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect/P[5]/Sub[6]",
            "Text": "Le Hocq ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "Placement": "Block"
            }
        },
        {
            "Bounds": [
                240.25999450683594,
                580.9832000732422,
                286.1240692138672,
                590.438232421875
            ],
            "ClipBounds": [
                240.25999450683594,
                580.9832000732422,
                286.1240692138672,
                590.438232421875
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "DFYGRN+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/P[6]",
            "Text": "DETAILS ",
            "TextSize": 10.080001831054688
        },
        {
            "Bounds": [
                412.8000030517578,
                580.9832000732422,
                464.58103942871094,
                590.438232421875
            ],
            "ClipBounds": [
                412.8000030517578,
                580.9832000732422,
                464.58103942871094,
                590.438232421875
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "DFYGRN+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/P[7]",
            "Text": "PAYMENT ",
            "TextSize": 10.080001831054688
        },
        {
            "Bounds": [
                240.25999450683594,
                514.7232055664062,
                368.7598419189453,
                577.1182403564453
            ],
            "ClipBounds": [
                240.25999450683594,
                514.7232055664062,
                368.7598419189453,
                577.1182403564453
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/P[8]",
            "Text": "aliqua consectetur voluptate est ullamco sint amet aliquip sunt duis commodo consequat Lorem aliqua id occaecat tempor sint ",
            "TextSize": 10.080001831054688
        },
        {
            "Bounds": [
                412.8000030517578,
                567.6631927490234,
                513.0480804443359,
                577.1182403564453
            ],
            "ClipBounds": [
                412.8000030517578,
                567.6631927490234,
                513.0480804443359,
                577.1182403564453
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/P[9]",
            "Text": "Due date: 30-06-2023 ",
            "TextSize": 10.080001831054688
        },
        {
            "Bounds": [
                410.63999938964844,
                535.3764038085938,
                459.87107849121094,
                545.844482421875
            ],
            "ClipBounds": [
                410.63999938964844,
                535.3764038085938,
                459.87107849121094,
                545.844482421875
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "DFYGRN+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/P[10]",
            "Text": "$11332.2 ",
            "TextSize": 11.160003662109375
        },
        {
            "Bounds": [
                77.447998046875,
                430.0731964111328,
                530.1510314941406,
                439.5282440185547
            ],
            "ClipBounds": [
                77.447998046875,
                430.0731964111328,
                530.1510314941406,
                439.5282440185547
            ],
            "Page": 0,
            "Path": "//Document/Sect/Table",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    414.73499999998603,
                    540.9379999999946,
                    447.73399999999674
                ],
                "NumCol": 4,
                "Placement": "Block",
                "SpaceAfter": 18
            }
        },
        {
            "Bounds": [
                77.447998046875,
                430.0731964111328,
                104.47239685058594,
                439.5282440185547
            ],
            "ClipBounds": [
                77.447998046875,
                430.0731964111328,
                104.47239685058594,
                439.5282440185547
            ],
            "Page": 0,
            "Path": "//Document/Sect/Table/TR/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    413.8949999999895,
                    358.78499999998894,
                    447.73399999999674
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
                "Height": 33.875,
                "InlineAlign": "Start",
                "RowIndex": 0,
                "Width": 287.25
            }
        },
        {
            "Bounds": [
                77.447998046875,
                430.0731964111328,
                104.47239685058594,
                439.5282440185547
            ],
            "ClipBounds": [
                77.447998046875,
                430.0731964111328,
                104.47239685058594,
                439.5282440185547
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "DFYGRN+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/Table/TR/TD/P",
            "Text": "ITEM ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                363.1000061035156,
                430.0731964111328,
                386.6570281982422,
                439.5282440185547
            ],
            "ClipBounds": [
                363.1000061035156,
                430.0731964111328,
                386.6570281982422,
                439.5282440185547
            ],
            "Page": 0,
            "Path": "//Document/Sect/Table/TR/TD[2]",
            "attributes": {
                "BBox": [
                    358.304999999993,
                    413.8949999999895,
                    415.6629999999859,
                    447.73399999999674
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
                "Height": 33.875,
                "InlineAlign": "Start",
                "RowIndex": 0,
                "Width": 57.375
            }
        },
        {
            "Bounds": [
                363.1000061035156,
                430.0731964111328,
                386.6570281982422,
                439.5282440185547
            ],
            "ClipBounds": [
                363.1000061035156,
                430.0731964111328,
                386.6570281982422,
                439.5282440185547
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "DFYGRN+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/Table/TR/TD[2]/P",
            "Text": "QTY ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                430.0731964111328,
                450.7712707519531,
                439.5282440185547
            ],
            "ClipBounds": [
                420.3800048828125,
                430.0731964111328,
                450.7712707519531,
                439.5282440185547
            ],
            "Page": 0,
            "Path": "//Document/Sect/Table/TR/TD[3]",
            "attributes": {
                "BBox": [
                    415.18299999999,
                    413.8949999999895,
                    481.8999999999942,
                    447.73399999999674
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
                "Height": 33.875,
                "InlineAlign": "Start",
                "RowIndex": 0,
                "Width": 66.75
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                430.0731964111328,
                450.7712707519531,
                439.5282440185547
            ],
            "ClipBounds": [
                420.3800048828125,
                430.0731964111328,
                450.7712707519531,
                439.5282440185547
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "DFYGRN+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/Table/TR/TD[3]/P",
            "Text": "RATE ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                483.4100036621094,
                430.0731964111328,
                530.1510314941406,
                439.5282440185547
            ],
            "ClipBounds": [
                483.4100036621094,
                430.0731964111328,
                530.1510314941406,
                439.5282440185547
            ],
            "Page": 0,
            "Path": "//Document/Sect/Table/TR/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    413.8949999999895,
                    541.417999999976,
                    447.73399999999674
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
                "Height": 33.875,
                "InlineAlign": "Start",
                "RowIndex": 0,
                "Width": 60
            }
        },
        {
            "Bounds": [
                483.4100036621094,
                430.0731964111328,
                530.1510314941406,
                439.5282440185547
            ],
            "ClipBounds": [
                483.4100036621094,
                430.0731964111328,
                530.1510314941406,
                439.5282440185547
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "DFYGRN+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/Table/TR/TD[4]/P",
            "Text": "AMOUNT ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                327.0632019042969,
                517.7280731201172,
                403.50823974609375
            ],
            "ClipBounds": [
                77.447998046875,
                327.0632019042969,
                517.7280731201172,
                403.50823974609375
            ],
            "Page": 0,
            "Path": "//Document/Sect/Table[2]",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    309.61999999999534,
                    540.9379999999946,
                    411.97499999999127
                ],
                "NumCol": 4,
                "NumRow": 3,
                "Placement": "Block",
                "SpaceAfter": 18
            }
        },
        {
            "Bounds": [
                77.447998046875,
                394.05320739746094,
                165.4766387939453,
                403.50823974609375
            ],
            "ClipBounds": [
                77.447998046875,
                394.05320739746094,
                165.4766387939453,
                403.50823974609375
            ],
            "Page": 0,
            "Path": "//Document/Sect/Table[2]/TR/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    377.7769999999873,
                    358.0649999999878,
                    411.97499999999127
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
                "Height": 34.25,
                "InlineAlign": "Start",
                "RowIndex": 0,
                "Width": 286.375
            }
        },
        {
            "Bounds": [
                77.447998046875,
                394.05320739746094,
                165.4766387939453,
                403.50823974609375
            ],
            "ClipBounds": [
                77.447998046875,
                394.05320739746094,
                165.4766387939453,
                403.50823974609375
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/Table[2]/TR/TD/P",
            "Text": "Small Steel Towels ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                394.05320739746094,
                378.3000030517578,
                403.50823974609375
            ],
            "ClipBounds": [
                363.82000732421875,
                394.05320739746094,
                378.3000030517578,
                403.50823974609375
            ],
            "Page": 0,
            "Path": "//Document/Sect/Table[2]/TR/TD[2]",
            "attributes": {
                "BBox": [
                    357.58499999999185,
                    377.7769999999873,
                    414.22299999999814,
                    411.97499999999127
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
                "Height": 34.25,
                "InlineAlign": "Start",
                "RowIndex": 0,
                "Width": 56.625
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                394.05320739746094,
                378.3000030517578,
                403.50823974609375
            ],
            "ClipBounds": [
                363.82000732421875,
                394.05320739746094,
                378.3000030517578,
                403.50823974609375
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/Table[2]/TR/TD[2]/P",
            "Text": "45 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                394.05320739746094,
                434.86000061035156,
                403.50823974609375
            ],
            "ClipBounds": [
                420.3800048828125,
                394.05320739746094,
                434.86000061035156,
                403.50823974609375
            ],
            "Page": 0,
            "Path": "//Document/Sect/Table[2]/TR/TD[3]",
            "attributes": {
                "BBox": [
                    413.74299999998766,
                    377.7769999999873,
                    481.8999999999942,
                    411.97499999999127
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
                "Height": 34.25,
                "InlineAlign": "Start",
                "RowIndex": 0,
                "Width": 68.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                394.05320739746094,
                434.86000061035156,
                403.50823974609375
            ],
            "ClipBounds": [
                420.3800048828125,
                394.05320739746094,
                434.86000061035156,
                403.50823974609375
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/Table[2]/TR/TD[3]/P",
            "Text": "35 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                394.05320739746094,
                517.7280731201172,
                403.50823974609375
            ],
            "ClipBounds": [
                487.00999450683594,
                394.05320739746094,
                517.7280731201172,
                403.50823974609375
            ],
            "Page": 0,
            "Path": "//Document/Sect/Table[2]/TR/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    377.7769999999873,
                    541.417999999976,
                    411.97499999999127
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
                "Height": 34.25,
                "InlineAlign": "Start",
                "RowIndex": 0,
                "Width": 60
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                394.05320739746094,
                517.7280731201172,
                403.50823974609375
            ],
            "ClipBounds": [
                487.00999450683594,
                394.05320739746094,
                517.7280731201172,
                403.50823974609375
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/Table[2]/TR/TD[4]/P",
            "Text": "$1575 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                360.5731964111328,
                191.95680236816406,
                370.0282440185547
            ],
            "ClipBounds": [
                77.447998046875,
                360.5731964111328,
                191.95680236816406,
                370.0282440185547
            ],
            "Page": 0,
            "Path": "//Document/Sect/Table[2]/TR[2]/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    343.93799999999464,
                    358.0649999999878,
                    378.2569999999978
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
                "Height": 34.375,
                "InlineAlign": "Start",
                "RowIndex": 1,
                "Width": 286.375
            }
        },
        {
            "Bounds": [
                77.447998046875,
                360.5731964111328,
                191.95680236816406,
                370.0282440185547
            ],
            "ClipBounds": [
                77.447998046875,
                360.5731964111328,
                191.95680236816406,
                370.0282440185547
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/Table[2]/TR[2]/TD/P",
            "Text": "Fantastic Wooden Bacon ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                360.5731964111328,
                378.3000030517578,
                370.0282440185547
            ],
            "ClipBounds": [
                363.82000732421875,
                360.5731964111328,
                378.3000030517578,
                370.0282440185547
            ],
            "Page": 0,
            "Path": "//Document/Sect/Table[2]/TR[2]/TD[2]",
            "attributes": {
                "BBox": [
                    357.58499999999185,
                    343.93799999999464,
                    414.22299999999814,
                    378.2569999999978
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
                "Height": 34.375,
                "InlineAlign": "Start",
                "RowIndex": 1,
                "Width": 56.625
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                360.5731964111328,
                378.3000030517578,
                370.0282440185547
            ],
            "ClipBounds": [
                363.82000732421875,
                360.5731964111328,
                378.3000030517578,
                370.0282440185547
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/Table[2]/TR[2]/TD[2]/P",
            "Text": "14 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                360.5731964111328,
                434.86000061035156,
                370.0282440185547
            ],
            "ClipBounds": [
                420.3800048828125,
                360.5731964111328,
                434.86000061035156,
                370.0282440185547
            ],
            "Page": 0,
            "Path": "//Document/Sect/Table[2]/TR[2]/TD[3]",
            "attributes": {
                "BBox": [
                    413.74299999998766,
                    343.93799999999464,
                    481.8999999999942,
                    378.2569999999978
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
                "Height": 34.375,
                "InlineAlign": "Start",
                "RowIndex": 1,
                "Width": 68.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                360.5731964111328,
                434.86000061035156,
                370.0282440185547
            ],
            "ClipBounds": [
                420.3800048828125,
                360.5731964111328,
                434.86000061035156,
                370.0282440185547
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/Table[2]/TR[2]/TD[3]/P",
            "Text": "39 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                360.5731964111328,
                512.3251953125,
                370.0282440185547
            ],
            "ClipBounds": [
                487.00999450683594,
                360.5731964111328,
                512.3251953125,
                370.0282440185547
            ],
            "Page": 0,
            "Path": "//Document/Sect/Table[2]/TR[2]/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    343.93799999999464,
                    541.417999999976,
                    378.2569999999978
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
                "Height": 34.375,
                "InlineAlign": "Start",
                "RowIndex": 1,
                "Width": 60
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                360.5731964111328,
                512.3251953125,
                370.0282440185547
            ],
            "ClipBounds": [
                487.00999450683594,
                360.5731964111328,
                512.3251953125,
                370.0282440185547
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/Table[2]/TR[2]/TD[4]/P",
            "Text": "$546 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                327.0632019042969,
                162.45263671875,
                336.5182342529297
            ],
            "ClipBounds": [
                77.447998046875,
                327.0632019042969,
                162.45263671875,
                336.5182342529297
            ],
            "Page": 0,
            "Path": "//Document/Sect/Table[2]/TR[3]/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    309.0199999999895,
                    358.0649999999878,
                    344.41799999999057
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
                    0.625,
                    0.5,
                    0.25
                ],
                "ColIndex": 0,
                "Height": 35.375,
                "InlineAlign": "Start",
                "RowIndex": 2,
                "Width": 286.375
            }
        },
        {
            "Bounds": [
                77.447998046875,
                327.0632019042969,
                162.45263671875,
                336.5182342529297
            ],
            "ClipBounds": [
                77.447998046875,
                327.0632019042969,
                162.45263671875,
                336.5182342529297
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/Table[2]/TR[3]/TD/P",
            "Text": "Licensed Soft Fish ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                327.0632019042969,
                383.3751983642578,
                336.5182342529297
            ],
            "ClipBounds": [
                363.82000732421875,
                327.0632019042969,
                383.3751983642578,
                336.5182342529297
            ],
            "Page": 0,
            "Path": "//Document/Sect/Table[2]/TR[3]/TD[2]",
            "attributes": {
                "BBox": [
                    357.58499999999185,
                    309.0199999999895,
                    414.22299999999814,
                    344.41799999999057
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
                    0.625,
                    0.25,
                    0.25
                ],
                "ColIndex": 1,
                "Height": 35.375,
                "InlineAlign": "Start",
                "RowIndex": 2,
                "Width": 56.625
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                327.0632019042969,
                383.3751983642578,
                336.5182342529297
            ],
            "ClipBounds": [
                363.82000732421875,
                327.0632019042969,
                383.3751983642578,
                336.5182342529297
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/Table[2]/TR[3]/TD[2]/P",
            "Text": "101 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                327.0632019042969,
                434.86000061035156,
                336.5182342529297
            ],
            "ClipBounds": [
                420.3800048828125,
                327.0632019042969,
                434.86000061035156,
                336.5182342529297
            ],
            "Page": 0,
            "Path": "//Document/Sect/Table[2]/TR[3]/TD[3]",
            "attributes": {
                "BBox": [
                    413.74299999998766,
                    309.0199999999895,
                    481.8999999999942,
                    344.41799999999057
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
                    0.625,
                    0.25,
                    0.25
                ],
                "ColIndex": 2,
                "Height": 35.375,
                "InlineAlign": "Start",
                "RowIndex": 2,
                "Width": 68.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                327.0632019042969,
                434.86000061035156,
                336.5182342529297
            ],
            "ClipBounds": [
                420.3800048828125,
                327.0632019042969,
                434.86000061035156,
                336.5182342529297
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/Table[2]/TR[3]/TD[3]/P",
            "Text": "81 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                327.0632019042969,
                517.7280731201172,
                336.5182342529297
            ],
            "ClipBounds": [
                487.00999450683594,
                327.0632019042969,
                517.7280731201172,
                336.5182342529297
            ],
            "Page": 0,
            "Path": "//Document/Sect/Table[2]/TR[3]/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    309.0199999999895,
                    541.417999999976,
                    344.41799999999057
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
                    0.625,
                    0.25,
                    0.5
                ],
                "ColIndex": 3,
                "Height": 35.375,
                "InlineAlign": "Start",
                "RowIndex": 2,
                "Width": 60
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                327.0632019042969,
                517.7280731201172,
                336.5182342529297
            ],
            "ClipBounds": [
                487.00999450683594,
                327.0632019042969,
                517.7280731201172,
                336.5182342529297
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/Table[2]/TR[3]/TD[4]/P",
            "Text": "$8181 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                213.62319946289062,
                522.3792724609375,
                256.55824279785156
            ],
            "ClipBounds": [
                77.447998046875,
                213.62319946289062,
                522.3792724609375,
                256.55824279785156
            ],
            "Page": 0,
            "Path": "//Document/Sect/Table[3]",
            "attributes": {
                "BBox": [
                    77.03689999999915,
                    215.7829999999958,
                    519.8189999999886,
                    254.9019999999946
                ],
                "NumCol": 2,
                "NumRow": 2,
                "Placement": "Block",
                "SpaceAfter": 18
            }
        },
        {
            "Bounds": [
                77.447998046875,
                247.1031951904297,
                120.4593505859375,
                256.55824279785156
            ],
            "ClipBounds": [
                77.447998046875,
                247.1031951904297,
                120.4593505859375,
                256.55824279785156
            ],
            "Page": 0,
            "Path": "//Document/Sect/Table[3]/TR/TD",
            "attributes": {
                "BBox": [
                    77.03689999999915,
                    230.42299999999523,
                    358.54499999999825,
                    254.9019999999946
                ],
                "BlockAlign": "Before",
                "ColIndex": 0,
                "Height": 24.5,
                "InlineAlign": "Start",
                "RowIndex": 0,
                "Width": 281.5
            }
        },
        {
            "Bounds": [
                77.447998046875,
                247.1031951904297,
                120.4593505859375,
                256.55824279785156
            ],
            "ClipBounds": [
                77.447998046875,
                247.1031951904297,
                120.4593505859375,
                256.55824279785156
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "DFYGRN+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/Table[3]/TR/TD/P",
            "Text": "Subtotal ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                485.92999267578125,
                247.1031951904297,
                522.3792724609375,
                256.55824279785156
            ],
            "ClipBounds": [
                485.92999267578125,
                247.1031951904297,
                522.3792724609375,
                256.55824279785156
            ],
            "Page": 0,
            "Path": "//Document/Sect/Table[3]/TR/TD[2]",
            "attributes": {
                "BBox": [
                    358.54499999999825,
                    230.42299999999523,
                    519.8189999999886,
                    254.9019999999946
                ],
                "BlockAlign": "Before",
                "ColIndex": 1,
                "Height": 24.5,
                "InlineAlign": "End",
                "RowIndex": 0,
                "Width": 161.25
            }
        },
        {
            "Bounds": [
                485.92999267578125,
                247.1031951904297,
                522.3792724609375,
                256.55824279785156
            ],
            "ClipBounds": [
                485.92999267578125,
                247.1031951904297,
                522.3792724609375,
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
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/Table[3]/TR/TD[2]/P",
            "Text": "$10302 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                213.62319946289062,
                109.73143005371094,
                223.0782470703125
            ],
            "ClipBounds": [
                77.447998046875,
                213.62319946289062,
                109.73143005371094,
                223.0782470703125
            ],
            "Page": 0,
            "Path": "//Document/Sect/Table[3]/TR[2]/TD",
            "attributes": {
                "BBox": [
                    77.03689999999915,
                    215.7829999999958,
                    358.54499999999825,
                    230.42299999999523
                ],
                "BlockAlign": "After",
                "ColIndex": 0,
                "Height": 14.625,
                "InlineAlign": "Start",
                "RowIndex": 1,
                "Width": 281.5
            }
        },
        {
            "Bounds": [
                77.447998046875,
                213.62319946289062,
                109.73143005371094,
                223.0782470703125
            ],
            "ClipBounds": [
                77.447998046875,
                213.62319946289062,
                109.73143005371094,
                223.0782470703125
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "DFYGRN+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/Table[3]/TR[2]/TD/P",
            "Text": "Tax % ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                485.92999267578125,
                213.62319946289062,
                500.4100036621094,
                223.0782470703125
            ],
            "ClipBounds": [
                485.92999267578125,
                213.62319946289062,
                500.4100036621094,
                223.0782470703125
            ],
            "Page": 0,
            "Path": "//Document/Sect/Table[3]/TR[2]/TD[2]",
            "attributes": {
                "BBox": [
                    358.54499999999825,
                    215.7829999999958,
                    519.8189999999886,
                    230.42299999999523
                ],
                "BlockAlign": "After",
                "ColIndex": 1,
                "Height": 14.625,
                "InlineAlign": "End",
                "RowIndex": 1,
                "Width": 161.25
            }
        },
        {
            "Bounds": [
                485.92999267578125,
                213.62319946289062,
                500.4100036621094,
                223.0782470703125
            ],
            "ClipBounds": [
                485.92999267578125,
                213.62319946289062,
                500.4100036621094,
                223.0782470703125
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/Table[3]/TR[2]/TD[2]/P",
            "Text": "10 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                116.01319885253906,
                126.14447021484375,
                125.46824645996094
            ],
            "ClipBounds": [
                77.447998046875,
                116.01319885253906,
                126.14447021484375,
                125.46824645996094
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "DFYGRN+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/P[11]",
            "Text": "Total Due ",
            "TextSize": 10.080001831054688
        },
        {
            "Bounds": [
                485.92999267578125,
                114.08000183105469,
                526.1329956054688,
                122.52200317382812
            ],
            "ClipBounds": [
                485.92999267578125,
                114.08000183105469,
                526.1329956054688,
                122.52200317382812
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "OGLUPR+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/P[12]",
            "Text": "$11332.2 ",
            "TextSize": 9,
            "attributes": {
                "LineHeight": 10.75
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
        }
    ]
};

// let parser=new Parser();
// parser.parseApiResponse(jsonData);
// console.log(parser.collectiveParsedReponse);