const convertJSONtoCSV = require('./json_to_csv_converter');

// This function tackles the edge case of very large address elements
function parseBusinessAddress(input){
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
        "issueDate": issueDate
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
    let ind=0;
    while(ind<data.length){
        let str=data[ind];
        if(str[3]==="-" && str[7]==="-")
        break;
        ind++;
    }
    ind+=3;

    let invoiceDescription="";
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

        let parsedBusinessAddress=parseBusinessAddress(arialMtBeforeTitle);
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
          invoiceNumber: invoiceNumber,
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
        "ID_instance": "49 30 BC 7D 3B B7 B2 11 0A 00 67 45 8B 6B C6 23 ",
        "ID_permanent": "42 44 20 36 43 20 42 38 20 37 44 20 33 42 20 42 37 20 42 32 20 31 31 20 30 41 20 30 30 20 36 37 20 34 35 20 38 42 20 36 42 20 43 36 20 32 33 20 ",
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
                "name": "UAHNCK+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/P",
            "Text": "NearBy Electronics ",
            "TextSize": 10.080001831054688
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect/P[2]/Sub",
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect/P[2]/Sub[2]",
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect/P[2]/Sub[3]",
            "Text": "38556 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "Placement": "Block"
            }
        },
        {
            "Bounds": [
                340.05999755859375,
                708.1132049560547,
                543.2117614746094,
                730.5582427978516
            ],
            "ClipBounds": [
                340.05999755859375,
                708.1132049560547,
                543.2117614746094,
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
                "name": "UAHNCK+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/P[3]",
            "Text": "Invoice# PL77678066447653534291577565 Issue date ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 13,
                "TextAlign": "End"
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/P[4]",
            "Text": "12-05-2023 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125,
                "SpaceAfter": 8.125,
                "TextAlign": "End"
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
                "name": "EXFVMQ+ArialMT",
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/P[5]",
            "Text": "We are here to serve you better. Reach out to us in case of any concern or feedbacks. ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "SpaceAfter": 18
            }
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
                "name": "UAHNCK+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/H1",
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect[2]/P/Sub",
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect[2]/P/Sub[2]",
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect[2]/P/Sub[3]",
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect[2]/P/Sub[4]",
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect[2]/P/Sub[5]",
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect[2]/P/Sub[6]",
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
                "name": "UAHNCK+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/H1",
            "Text": "DETAILS ",
            "TextSize": 10.080001831054688
        },
        {
            "Bounds": [
                240.25999450683594,
                567.6631927490234,
                283.88623046875,
                577.1182403564453
            ],
            "ClipBounds": [
                240.25999450683594,
                567.6631927490234,
                283.88623046875,
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "it",
            "Page": 0,
            "Path": "//Document/Sect[3]/P",
            "Text": "aliqua eu ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "SpaceAfter": -12.125
            }
        },
        {
            "Bounds": [
                283.7552032470703,
                567.6631927490234,
                349.4263916015625,
                577.1182403564453
            ],
            "ClipBounds": [
                283.7552032470703,
                567.6631927490234,
                349.4263916015625,
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/P[2]",
            "Text": "Lorem sit sunt ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125,
                "TextAlign": "Center"
            }
        },
        {
            "Bounds": [
                240.25999450683594,
                554.6831970214844,
                314.90240478515625,
                564.1382446289062
            ],
            "ClipBounds": [
                240.25999450683594,
                554.6831970214844,
                314.90240478515625,
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[3]/P[3]",
            "Text": "cillum veniam et ",
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
                "name": "UAHNCK+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/H1",
            "Text": "PAYMENT ",
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/P",
            "Text": "Due date: 16-06-2023 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "SpaceAfter": 18
            }
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
                "name": "UAHNCK+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Aside/P",
            "Text": "$41610.8 ",
            "TextSize": 11.160003662109375,
            "attributes": {
                "SpaceAfter": 18
            }
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
            "Path": "//Document/Sect[4]/Table",
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
            "Path": "//Document/Sect[4]/Table/TR/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    414.13499999999476,
                    358.78499999998894,
                    447.73399999999674
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": [
                    "Solid",
                    "Double",
                    "Solid",
                    "Solid"
                ],
                "BorderThickness": [
                    0.625,
                    0.625,
                    0.5,
                    0.25
                ],
                "ColIndex": 0,
                "Height": 33.625,
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
                "name": "UAHNCK+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table/TR/TD/P",
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
            "Path": "//Document/Sect[4]/Table/TR/TD[2]",
            "attributes": {
                "BBox": [
                    358.304999999993,
                    414.13499999999476,
                    415.6629999999859,
                    447.73399999999674
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": [
                    "Solid",
                    "Double",
                    "Solid",
                    "Solid"
                ],
                "BorderThickness": [
                    0.625,
                    0.625,
                    0.25,
                    0.25
                ],
                "ColIndex": 1,
                "Height": 33.625,
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
                "name": "UAHNCK+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table/TR/TD[2]/P",
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
            "Path": "//Document/Sect[4]/Table/TR/TD[3]",
            "attributes": {
                "BBox": [
                    415.18299999999,
                    414.13499999999476,
                    481.8999999999942,
                    447.73399999999674
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": [
                    "Solid",
                    "Double",
                    "Solid",
                    "Solid"
                ],
                "BorderThickness": [
                    0.625,
                    0.625,
                    0.25,
                    0.25
                ],
                "ColIndex": 2,
                "Height": 33.625,
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
                "name": "UAHNCK+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table/TR/TD[3]/P",
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
            "Path": "//Document/Sect[4]/Table/TR/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    414.13499999999476,
                    541.417999999976,
                    447.73399999999674
                ],
                "BlockAlign": "Middle",
                "BorderColor": [
                    0,
                    0,
                    0
                ],
                "BorderStyle": [
                    "Solid",
                    "Double",
                    "Solid",
                    "Solid"
                ],
                "BorderThickness": [
                    0.625,
                    0.625,
                    0.25,
                    0.5
                ],
                "ColIndex": 3,
                "Height": 33.625,
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
                "name": "UAHNCK+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table/TR/TD[4]/P",
            "Text": "AMOUNT ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                159.59320068359375,
                517.7280731201172,
                403.50823974609375
            ],
            "ClipBounds": [
                77.447998046875,
                159.59320068359375,
                517.7280731201172,
                403.50823974609375
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    142.34599999999773,
                    540.9379999999946,
                    411.97499999999127
                ],
                "NumCol": 4,
                "NumRow": 8,
                "Placement": "Block",
                "SpaceAfter": 18
            }
        },
        {
            "Bounds": [
                77.447998046875,
                394.05320739746094,
                194.80943298339844,
                403.50823974609375
            ],
            "ClipBounds": [
                77.447998046875,
                394.05320739746094,
                194.80943298339844,
                403.50823974609375
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR/TD",
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
                "BorderStyle": [
                    "Double",
                    "Solid",
                    "Solid",
                    "Solid"
                ],
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
                194.80943298339844,
                403.50823974609375
            ],
            "ClipBounds": [
                77.447998046875,
                394.05320739746094,
                194.80943298339844,
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR/TD/P",
            "Text": "Handmade Concrete Bike ",
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
            "Path": "//Document/Sect[4]/Table[2]/TR/TD[2]",
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
                "BorderStyle": [
                    "Double",
                    "Solid",
                    "Solid",
                    "Solid"
                ],
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR/TD[2]/P",
            "Text": "47 ",
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
            "Path": "//Document/Sect[4]/Table[2]/TR/TD[3]",
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
                "BorderStyle": [
                    "Double",
                    "Solid",
                    "Solid",
                    "Solid"
                ],
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR/TD[3]/P",
            "Text": "31 ",
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
            "Path": "//Document/Sect[4]/Table[2]/TR/TD[4]",
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
                "BorderStyle": [
                    "Double",
                    "Solid",
                    "Solid",
                    "Solid"
                ],
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR/TD[4]/P",
            "Text": "$1457 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                360.5731964111328,
                190.4951934814453,
                370.0282440185547
            ],
            "ClipBounds": [
                77.447998046875,
                360.5731964111328,
                190.4951934814453,
                370.0282440185547
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[2]/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    344.6579999999958,
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
                "Height": 33.625,
                "InlineAlign": "Start",
                "RowIndex": 1,
                "Width": 286.375
            }
        },
        {
            "Bounds": [
                77.447998046875,
                360.5731964111328,
                190.4951934814453,
                370.0282440185547
            ],
            "ClipBounds": [
                77.447998046875,
                360.5731964111328,
                190.4951934814453,
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[2]/TD/P",
            "Text": "Handcrafted Fresh Pizza ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                360.5731964111328,
                383.3751983642578,
                370.0282440185547
            ],
            "ClipBounds": [
                363.82000732421875,
                360.5731964111328,
                383.3751983642578,
                370.0282440185547
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[2]/TD[2]",
            "attributes": {
                "BBox": [
                    357.58499999999185,
                    344.6579999999958,
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
                "Height": 33.625,
                "InlineAlign": "Start",
                "RowIndex": 1,
                "Width": 56.625
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                360.5731964111328,
                383.3751983642578,
                370.0282440185547
            ],
            "ClipBounds": [
                363.82000732421875,
                360.5731964111328,
                383.3751983642578,
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[2]/TD[2]/P",
            "Text": "113 ",
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
            "Path": "//Document/Sect[4]/Table[2]/TR[2]/TD[3]",
            "attributes": {
                "BBox": [
                    413.74299999998766,
                    344.6579999999958,
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
                "Height": 33.625,
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[2]/TD[3]/P",
            "Text": "71 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                360.5731964111328,
                517.7280731201172,
                370.0282440185547
            ],
            "ClipBounds": [
                487.00999450683594,
                360.5731964111328,
                517.7280731201172,
                370.0282440185547
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[2]/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    344.6579999999958,
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
                "Height": 33.625,
                "InlineAlign": "Start",
                "RowIndex": 1,
                "Width": 60
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                360.5731964111328,
                517.7280731201172,
                370.0282440185547
            ],
            "ClipBounds": [
                487.00999450683594,
                360.5731964111328,
                517.7280731201172,
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[2]/TD[4]/P",
            "Text": "$8023 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                327.0632019042969,
                176.49407958984375,
                336.5182342529297
            ],
            "ClipBounds": [
                77.447998046875,
                327.0632019042969,
                176.49407958984375,
                336.5182342529297
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[3]/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    310.09999999999127,
                    358.0649999999878,
                    345.13799999999173
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
                "RowIndex": 2,
                "Width": 286.375
            }
        },
        {
            "Bounds": [
                77.447998046875,
                327.0632019042969,
                176.49407958984375,
                336.5182342529297
            ],
            "ClipBounds": [
                77.447998046875,
                327.0632019042969,
                176.49407958984375,
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[3]/TD/P",
            "Text": "Small Plastic Chicken ",
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
            "Path": "//Document/Sect[4]/Table[2]/TR[3]/TD[2]",
            "attributes": {
                "BBox": [
                    357.58499999999185,
                    310.09999999999127,
                    414.22299999999814,
                    345.13799999999173
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[3]/TD[2]/P",
            "Text": "100 ",
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
            "Path": "//Document/Sect[4]/Table[2]/TR[3]/TD[3]",
            "attributes": {
                "BBox": [
                    413.74299999998766,
                    310.09999999999127,
                    481.8999999999942,
                    345.13799999999173
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[3]/TD[3]/P",
            "Text": "66 ",
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
            "Path": "//Document/Sect[4]/Table[2]/TR[3]/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    310.09999999999127,
                    541.417999999976,
                    345.13799999999173
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
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[3]/TD[4]/P",
            "Text": "$6600 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                293.5632019042969,
                172.0286407470703,
                303.0182342529297
            ],
            "ClipBounds": [
                77.447998046875,
                293.5632019042969,
                172.0286407470703,
                303.0182342529297
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[4]/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    276.98099999999977,
                    358.0649999999878,
                    310.5799999999872
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
                "RowIndex": 3,
                "Width": 286.375
            }
        },
        {
            "Bounds": [
                77.447998046875,
                293.5632019042969,
                172.0286407470703,
                303.0182342529297
            ],
            "ClipBounds": [
                77.447998046875,
                293.5632019042969,
                172.0286407470703,
                303.0182342529297
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[4]/TD/P",
            "Text": "Licensed Cotton Ball ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                293.5632019042969,
                378.3000030517578,
                303.0182342529297
            ],
            "ClipBounds": [
                363.82000732421875,
                293.5632019042969,
                378.3000030517578,
                303.0182342529297
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[4]/TD[2]",
            "attributes": {
                "BBox": [
                    357.58499999999185,
                    276.98099999999977,
                    414.22299999999814,
                    310.5799999999872
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
                "RowIndex": 3,
                "Width": 56.625
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                293.5632019042969,
                378.3000030517578,
                303.0182342529297
            ],
            "ClipBounds": [
                363.82000732421875,
                293.5632019042969,
                378.3000030517578,
                303.0182342529297
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[4]/TD[2]/P",
            "Text": "97 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                293.5632019042969,
                439.93519592285156,
                303.0182342529297
            ],
            "ClipBounds": [
                420.3800048828125,
                293.5632019042969,
                439.93519592285156,
                303.0182342529297
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[4]/TD[3]",
            "attributes": {
                "BBox": [
                    413.74299999998766,
                    276.98099999999977,
                    481.8999999999942,
                    310.5799999999872
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
                "RowIndex": 3,
                "Width": 68.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                293.5632019042969,
                439.93519592285156,
                303.0182342529297
            ],
            "ClipBounds": [
                420.3800048828125,
                293.5632019042969,
                439.93519592285156,
                303.0182342529297
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[4]/TD[3]/P",
            "Text": "100 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                293.5632019042969,
                517.7280731201172,
                303.0182342529297
            ],
            "ClipBounds": [
                487.00999450683594,
                293.5632019042969,
                517.7280731201172,
                303.0182342529297
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[4]/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    276.98099999999977,
                    541.417999999976,
                    310.5799999999872
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
                "RowIndex": 3,
                "Width": 60
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                293.5632019042969,
                517.7280731201172,
                303.0182342529297
            ],
            "ClipBounds": [
                487.00999450683594,
                293.5632019042969,
                517.7280731201172,
                303.0182342529297
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[4]/TD[4]/P",
            "Text": "$9700 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                260.0832061767578,
                160.4971160888672,
                269.5382385253906
            ],
            "ClipBounds": [
                77.447998046875,
                260.0832061767578,
                160.4971160888672,
                269.5382385253906
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[5]/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    243.14199999999983,
                    358.0649999999878,
                    277.4609999999957
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
                "Height": 34.375,
                "InlineAlign": "Start",
                "RowIndex": 4,
                "Width": 286.375
            }
        },
        {
            "Bounds": [
                77.447998046875,
                260.0832061767578,
                160.4971160888672,
                269.5382385253906
            ],
            "ClipBounds": [
                77.447998046875,
                260.0832061767578,
                160.4971160888672,
                269.5382385253906
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[5]/TD/P",
            "Text": "Small Granite Ball ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                260.0832061767578,
                378.3000030517578,
                269.5382385253906
            ],
            "ClipBounds": [
                363.82000732421875,
                260.0832061767578,
                378.3000030517578,
                269.5382385253906
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[5]/TD[2]",
            "attributes": {
                "BBox": [
                    357.58499999999185,
                    243.14199999999983,
                    414.22299999999814,
                    277.4609999999957
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
                "Height": 34.375,
                "InlineAlign": "Start",
                "RowIndex": 4,
                "Width": 56.625
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                260.0832061767578,
                378.3000030517578,
                269.5382385253906
            ],
            "ClipBounds": [
                363.82000732421875,
                260.0832061767578,
                378.3000030517578,
                269.5382385253906
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[5]/TD[2]/P",
            "Text": "46 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                260.0832061767578,
                434.86000061035156,
                269.5382385253906
            ],
            "ClipBounds": [
                420.3800048828125,
                260.0832061767578,
                434.86000061035156,
                269.5382385253906
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[5]/TD[3]",
            "attributes": {
                "BBox": [
                    413.74299999998766,
                    243.14199999999983,
                    481.8999999999942,
                    277.4609999999957
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
                "Height": 34.375,
                "InlineAlign": "Start",
                "RowIndex": 4,
                "Width": 68.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                260.0832061767578,
                434.86000061035156,
                269.5382385253906
            ],
            "ClipBounds": [
                420.3800048828125,
                260.0832061767578,
                434.86000061035156,
                269.5382385253906
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[5]/TD[3]/P",
            "Text": "54 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                260.0832061767578,
                517.7280731201172,
                269.5382385253906
            ],
            "ClipBounds": [
                487.00999450683594,
                260.0832061767578,
                517.7280731201172,
                269.5382385253906
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[5]/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    243.14199999999983,
                    541.417999999976,
                    277.4609999999957
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
                "Height": 34.375,
                "InlineAlign": "Start",
                "RowIndex": 4,
                "Width": 60
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                260.0832061767578,
                517.7280731201172,
                269.5382385253906
            ],
            "ClipBounds": [
                487.00999450683594,
                260.0832061767578,
                517.7280731201172,
                269.5382385253906
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[5]/TD[4]/P",
            "Text": "$2484 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                226.5832061767578,
                170.0731201171875,
                236.03823852539062
            ],
            "ClipBounds": [
                77.447998046875,
                226.5832061767578,
                170.0731201171875,
                236.03823852539062
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[6]/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    208.58399999999529,
                    358.0649999999878,
                    243.62199999999575
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
                "Height": 35,
                "InlineAlign": "Start",
                "RowIndex": 5,
                "Width": 286.375
            }
        },
        {
            "Bounds": [
                77.447998046875,
                226.5832061767578,
                170.0731201171875,
                236.03823852539062
            ],
            "ClipBounds": [
                77.447998046875,
                226.5832061767578,
                170.0731201171875,
                236.03823852539062
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[6]/TD/P",
            "Text": "Rustic Concrete Hat ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                226.5832061767578,
                378.3000030517578,
                236.03823852539062
            ],
            "ClipBounds": [
                363.82000732421875,
                226.5832061767578,
                378.3000030517578,
                236.03823852539062
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[6]/TD[2]",
            "attributes": {
                "BBox": [
                    357.58499999999185,
                    208.58399999999529,
                    414.22299999999814,
                    243.62199999999575
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
                "Height": 35,
                "InlineAlign": "Start",
                "RowIndex": 5,
                "Width": 56.625
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                226.5832061767578,
                378.3000030517578,
                236.03823852539062
            ],
            "ClipBounds": [
                363.82000732421875,
                226.5832061767578,
                378.3000030517578,
                236.03823852539062
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[6]/TD[2]/P",
            "Text": "97 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                226.5832061767578,
                434.86000061035156,
                236.03823852539062
            ],
            "ClipBounds": [
                420.3800048828125,
                226.5832061767578,
                434.86000061035156,
                236.03823852539062
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[6]/TD[3]",
            "attributes": {
                "BBox": [
                    413.74299999998766,
                    208.58399999999529,
                    481.8999999999942,
                    243.62199999999575
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
                "Height": 35,
                "InlineAlign": "Start",
                "RowIndex": 5,
                "Width": 68.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                226.5832061767578,
                434.86000061035156,
                236.03823852539062
            ],
            "ClipBounds": [
                420.3800048828125,
                226.5832061767578,
                434.86000061035156,
                236.03823852539062
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[6]/TD[3]/P",
            "Text": "69 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                226.5832061767578,
                517.7280731201172,
                236.03823852539062
            ],
            "ClipBounds": [
                487.00999450683594,
                226.5832061767578,
                517.7280731201172,
                236.03823852539062
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[6]/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    208.58399999999529,
                    541.417999999976,
                    243.62199999999575
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
                "Height": 35,
                "InlineAlign": "Start",
                "RowIndex": 5,
                "Width": 60
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                226.5832061767578,
                517.7280731201172,
                236.03823852539062
            ],
            "ClipBounds": [
                487.00999450683594,
                226.5832061767578,
                517.7280731201172,
                236.03823852539062
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[6]/TD[4]/P",
            "Text": "$6693 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                193.0731964111328,
                157.311767578125,
                202.5282440185547
            ],
            "ClipBounds": [
                77.447998046875,
                193.0731964111328,
                157.311767578125,
                202.5282440185547
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[7]/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    175.4649999999965,
                    358.0649999999878,
                    209.0639999999985
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
                "RowIndex": 6,
                "Width": 286.375
            }
        },
        {
            "Bounds": [
                77.447998046875,
                193.0731964111328,
                157.311767578125,
                202.5282440185547
            ],
            "ClipBounds": [
                77.447998046875,
                193.0731964111328,
                157.311767578125,
                202.5282440185547
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[7]/TD/P",
            "Text": "Tasty Steel Chair ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                193.0731964111328,
                378.3000030517578,
                202.5282440185547
            ],
            "ClipBounds": [
                363.82000732421875,
                193.0731964111328,
                378.3000030517578,
                202.5282440185547
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[7]/TD[2]",
            "attributes": {
                "BBox": [
                    357.58499999999185,
                    175.4649999999965,
                    414.22299999999814,
                    209.0639999999985
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
                "RowIndex": 6,
                "Width": 56.625
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                193.0731964111328,
                378.3000030517578,
                202.5282440185547
            ],
            "ClipBounds": [
                363.82000732421875,
                193.0731964111328,
                378.3000030517578,
                202.5282440185547
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[7]/TD[2]/P",
            "Text": "78 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                193.0731964111328,
                434.86000061035156,
                202.5282440185547
            ],
            "ClipBounds": [
                420.3800048828125,
                193.0731964111328,
                434.86000061035156,
                202.5282440185547
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[7]/TD[3]",
            "attributes": {
                "BBox": [
                    413.74299999998766,
                    175.4649999999965,
                    481.8999999999942,
                    209.0639999999985
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
                "RowIndex": 6,
                "Width": 68.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                193.0731964111328,
                434.86000061035156,
                202.5282440185547
            ],
            "ClipBounds": [
                420.3800048828125,
                193.0731964111328,
                434.86000061035156,
                202.5282440185547
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[7]/TD[3]/P",
            "Text": "20 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                193.0731964111328,
                517.7280731201172,
                202.5282440185547
            ],
            "ClipBounds": [
                487.00999450683594,
                193.0731964111328,
                517.7280731201172,
                202.5282440185547
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[7]/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    175.4649999999965,
                    541.417999999976,
                    209.0639999999985
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
                "RowIndex": 6,
                "Width": 60
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                193.0731964111328,
                517.7280731201172,
                202.5282440185547
            ],
            "ClipBounds": [
                487.00999450683594,
                193.0731964111328,
                517.7280731201172,
                202.5282440185547
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[7]/TD[4]/P",
            "Text": "$1560 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                159.59320068359375,
                160.36607360839844,
                169.04823303222656
            ],
            "ClipBounds": [
                77.447998046875,
                159.59320068359375,
                160.36607360839844,
                169.04823303222656
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[8]/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    141.74599999999919,
                    358.0649999999878,
                    175.9449999999997
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
                "Height": 34.25,
                "InlineAlign": "Start",
                "RowIndex": 7,
                "Width": 286.375
            }
        },
        {
            "Bounds": [
                77.447998046875,
                159.59320068359375,
                160.36607360839844,
                169.04823303222656
            ],
            "ClipBounds": [
                77.447998046875,
                159.59320068359375,
                160.36607360839844,
                169.04823303222656
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[8]/TD/P",
            "Text": "Refined Metal Hat ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                159.59320068359375,
                378.3000030517578,
                169.04823303222656
            ],
            "ClipBounds": [
                363.82000732421875,
                159.59320068359375,
                378.3000030517578,
                169.04823303222656
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[8]/TD[2]",
            "attributes": {
                "BBox": [
                    357.58499999999185,
                    141.74599999999919,
                    414.22299999999814,
                    175.9449999999997
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
                "Height": 34.25,
                "InlineAlign": "Start",
                "RowIndex": 7,
                "Width": 56.625
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                159.59320068359375,
                378.3000030517578,
                169.04823303222656
            ],
            "ClipBounds": [
                363.82000732421875,
                159.59320068359375,
                378.3000030517578,
                169.04823303222656
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[8]/TD[2]/P",
            "Text": "57 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                159.59320068359375,
                434.86000061035156,
                169.04823303222656
            ],
            "ClipBounds": [
                420.3800048828125,
                159.59320068359375,
                434.86000061035156,
                169.04823303222656
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[8]/TD[3]",
            "attributes": {
                "BBox": [
                    413.74299999998766,
                    141.74599999999919,
                    481.8999999999942,
                    175.9449999999997
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
                "Height": 34.25,
                "InlineAlign": "Start",
                "RowIndex": 7,
                "Width": 68.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                159.59320068359375,
                434.86000061035156,
                169.04823303222656
            ],
            "ClipBounds": [
                420.3800048828125,
                159.59320068359375,
                434.86000061035156,
                169.04823303222656
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[8]/TD[3]/P",
            "Text": "23 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                159.59320068359375,
                517.7280731201172,
                169.04823303222656
            ],
            "ClipBounds": [
                487.00999450683594,
                159.59320068359375,
                517.7280731201172,
                169.04823303222656
            ],
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[8]/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    141.74599999999919,
                    541.417999999976,
                    175.9449999999997
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
                "Height": 34.25,
                "InlineAlign": "Start",
                "RowIndex": 7,
                "Width": 60
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                159.59320068359375,
                517.7280731201172,
                169.04823303222656
            ],
            "ClipBounds": [
                487.00999450683594,
                159.59320068359375,
                517.7280731201172,
                169.04823303222656
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[4]/Table[2]/TR[8]/TD[4]/P",
            "Text": "$1311 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                563.5700073242188,
                526.1329956054688,
                706.0482330322266
            ],
            "ClipBounds": [
                77.447998046875,
                563.5700073242188,
                526.1329956054688,
                706.0482330322266
            ],
            "Page": 1,
            "Path": "//Document/Sect[4]/Table[3]",
            "attributes": {
                "BBox": [
                    71.99709999999686,
                    563.4089999999851,
                    540.6979999999749,
                    704.4039999999804
                ],
                "NumCol": 2,
                "NumRow": 3,
                "Placement": "Block",
                "SpaceAfter": 11.25
            }
        },
        {
            "Bounds": [
                77.447998046875,
                696.5932006835938,
                120.4593505859375,
                706.0482330322266
            ],
            "ClipBounds": [
                77.447998046875,
                696.5932006835938,
                120.4593505859375,
                706.0482330322266
            ],
            "Page": 1,
            "Path": "//Document/Sect[4]/Table[3]/TR/TD",
            "attributes": {
                "BBox": [
                    71.99709999999686,
                    679.6849999999977,
                    480.2199999999866,
                    704.4039999999804
                ],
                "BlockAlign": "Before",
                "ColIndex": 0,
                "Height": 24.75,
                "InlineAlign": "Start",
                "RowIndex": 0,
                "Width": 408.25
            }
        },
        {
            "Bounds": [
                77.447998046875,
                696.5932006835938,
                120.4593505859375,
                706.0482330322266
            ],
            "ClipBounds": [
                77.447998046875,
                696.5932006835938,
                120.4593505859375,
                706.0482330322266
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "UAHNCK+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 1,
            "Path": "//Document/Sect[4]/Table[3]/TR/TD/P",
            "Text": "Subtotal ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                485.92999267578125,
                696.5932006835938,
                522.3792724609375,
                706.0482330322266
            ],
            "ClipBounds": [
                485.92999267578125,
                696.5932006835938,
                522.3792724609375,
                706.0482330322266
            ],
            "Page": 1,
            "Path": "//Document/Sect[4]/Table[3]/TR/TD[2]",
            "attributes": {
                "BBox": [
                    480.2199999999866,
                    679.6849999999977,
                    540.6979999999749,
                    704.4039999999804
                ],
                "BlockAlign": "Before",
                "ColIndex": 1,
                "Height": 24.75,
                "InlineAlign": "Start",
                "RowIndex": 0,
                "Width": 60.5
            }
        },
        {
            "Bounds": [
                485.92999267578125,
                696.5932006835938,
                522.3792724609375,
                706.0482330322266
            ],
            "ClipBounds": [
                485.92999267578125,
                696.5932006835938,
                522.3792724609375,
                706.0482330322266
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 1,
            "Path": "//Document/Sect[4]/Table[3]/TR/TD[2]/P",
            "Text": "$37828 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                663.1132049560547,
                109.73143005371094,
                672.5682373046875
            ],
            "ClipBounds": [
                77.447998046875,
                663.1132049560547,
                109.73143005371094,
                672.5682373046875
            ],
            "Page": 1,
            "Path": "//Document/Sect[4]/Table[3]/TR[2]/TD",
            "attributes": {
                "BBox": [
                    71.99709999999686,
                    625.3269999999902,
                    480.2199999999866,
                    679.6849999999977
                ],
                "BlockAlign": "Before",
                "BorderColor": [
                    null,
                    [
                        0.6235349999999755,
                        0.6235349999999755,
                        0.6235349999999755
                    ],
                    null,
                    null
                ],
                "BorderStyle": [
                    "None",
                    "Solid",
                    "None",
                    "None"
                ],
                "BorderThickness": [
                    0,
                    0.375,
                    0,
                    0
                ],
                "ColIndex": 0,
                "Height": 54.375,
                "InlineAlign": "Start",
                "RowIndex": 1,
                "Width": 408.25
            }
        },
        {
            "Bounds": [
                77.447998046875,
                663.1132049560547,
                109.73143005371094,
                672.5682373046875
            ],
            "ClipBounds": [
                77.447998046875,
                663.1132049560547,
                109.73143005371094,
                672.5682373046875
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "UAHNCK+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 1,
            "Path": "//Document/Sect[4]/Table[3]/TR[2]/TD/P",
            "Text": "Tax % ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                485.92999267578125,
                663.1132049560547,
                500.4100036621094,
                672.5682373046875
            ],
            "ClipBounds": [
                485.92999267578125,
                663.1132049560547,
                500.4100036621094,
                672.5682373046875
            ],
            "Page": 1,
            "Path": "//Document/Sect[4]/Table[3]/TR[2]/TD[2]",
            "attributes": {
                "BBox": [
                    480.2199999999866,
                    625.3269999999902,
                    540.6979999999749,
                    679.6849999999977
                ],
                "BlockAlign": "Before",
                "BorderColor": [
                    null,
                    [
                        0.6235349999999755,
                        0.6235349999999755,
                        0.6235349999999755
                    ],
                    null,
                    null
                ],
                "BorderStyle": [
                    "None",
                    "Solid",
                    "None",
                    "None"
                ],
                "BorderThickness": [
                    0,
                    0.375,
                    0,
                    0
                ],
                "ColIndex": 1,
                "Height": 54.375,
                "InlineAlign": "Start",
                "RowIndex": 1,
                "Width": 60.5
            }
        },
        {
            "Bounds": [
                485.92999267578125,
                663.1132049560547,
                500.4100036621094,
                672.5682373046875
            ],
            "ClipBounds": [
                485.92999267578125,
                663.1132049560547,
                500.4100036621094,
                672.5682373046875
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 1,
            "Path": "//Document/Sect[4]/Table[3]/TR[2]/TD[2]/P",
            "Text": "10 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                565.8632049560547,
                126.14447021484375,
                575.3182373046875
            ],
            "ClipBounds": [
                77.447998046875,
                565.8632049560547,
                126.14447021484375,
                575.3182373046875
            ],
            "Page": 1,
            "Path": "//Document/Sect[4]/Table[3]/TR[3]/TD",
            "attributes": {
                "BBox": [
                    71.99709999999686,
                    563.4089999999851,
                    480.2199999999866,
                    626.1669999999867
                ],
                "BlockAlign": "After",
                "BorderColor": [
                    [
                        0.6235349999999755,
                        0.6235349999999755,
                        0.6235349999999755
                    ],
                    null,
                    null,
                    null
                ],
                "BorderStyle": [
                    "Solid",
                    "None",
                    "None",
                    "None"
                ],
                "BorderThickness": [
                    0.375,
                    0,
                    0,
                    0
                ],
                "ColIndex": 0,
                "Height": 62.75,
                "InlineAlign": "Start",
                "RowIndex": 2,
                "Width": 408.25
            }
        },
        {
            "Bounds": [
                77.447998046875,
                565.8632049560547,
                126.14447021484375,
                575.3182373046875
            ],
            "ClipBounds": [
                77.447998046875,
                565.8632049560547,
                126.14447021484375,
                575.3182373046875
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "UAHNCK+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 1,
            "Path": "//Document/Sect[4]/Table[3]/TR[3]/TD/P",
            "Text": "Total Due ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                485.92999267578125,
                563.5700073242188,
                526.1329956054688,
                572.0119934082031
            ],
            "ClipBounds": [
                485.92999267578125,
                563.5700073242188,
                526.1329956054688,
                572.0119934082031
            ],
            "Page": 1,
            "Path": "//Document/Sect[4]/Table[3]/TR[3]/TD[2]",
            "attributes": {
                "BBox": [
                    480.2199999999866,
                    563.4089999999851,
                    540.6979999999749,
                    626.1669999999867
                ],
                "BlockAlign": "After",
                "BorderColor": [
                    [
                        0.6235349999999755,
                        0.6235349999999755,
                        0.6235349999999755
                    ],
                    null,
                    null,
                    null
                ],
                "BorderStyle": [
                    "Solid",
                    "None",
                    "None",
                    "None"
                ],
                "BorderThickness": [
                    0.375,
                    0,
                    0,
                    0
                ],
                "ColIndex": 1,
                "Height": 62.75,
                "InlineAlign": "Start",
                "RowIndex": 2,
                "Width": 60.5
            }
        },
        {
            "Bounds": [
                485.92999267578125,
                563.5700073242188,
                526.1329956054688,
                572.0119934082031
            ],
            "ClipBounds": [
                485.92999267578125,
                563.5700073242188,
                526.1329956054688,
                572.0119934082031
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EXFVMQ+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 1,
            "Path": "//Document/Sect[4]/Table[3]/TR[3]/TD[2]/P",
            "Text": "$41610.8 ",
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

let parser=new Parser();
parser.parseApiResponse(jsonData);
console.log(parser.collectiveParsedReponse);