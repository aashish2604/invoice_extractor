const convertJSONtoCSV = require('./json_to_csv_converter');

// This function tackles the edge case of very large address elements
function parseBusinessAddress(address){

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
        "zipcode": zipcode
    };

    return responseJson;
}


function parseInvoiceDetails(data){
    let unparsedIssueDate=data.pop().trim();
    let parsedIssueDate=new Date(unparsedIssueDate);
    
    //I am not using array indexes directly for invoice number to tackle
    // the edge case of exceptionally long invoice number (like a 4 line invoice number)
    
    let leftoverString="";
    for(i in data){
        let size=data[i].length;
        if(data[i][size-2]==='#')
        leftoverString+=data[i];
        else
        leftoverString+=data[i].trim();
    }
    leftoverString=leftoverString.substring(9).trim();
    let invoiceNumber= leftoverString.replace("Issue date","").trim();

    return {
        "issuedDate": parsedIssueDate,
        "invoiceNumber": invoiceNumber
    };
}


function parseCustomerDetails(data){
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
        "addressLine2": addressLine2
    }
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
        let tax;


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
            if(json.elements[i].Font!== undefined && json.elements[i].Font.family_name === "Arial MT") break;
            i++;
        }

        businessDescription=json.elements[i].Text.trim();
        i++;

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
        tax=Number(itemTableData.pop());
        itemTableData.pop();




        console.log(arialBeforeTitle);
        console.log(arialMtBeforeTitle);
        console.log(businessName);
        console.log(businessDescription);
        console.log(invoiceDueDate);
        console.log(arialMtBetweenTitleTable);
        console.log(tax);
        console.log(itemTableData);




        
        // // Business address details in JSON format
        // let parsedBusinessAddress=parseBusinessAddress(businessAddress);
        // // Invoice details excluding item specific properties in JSON format
        // let parsedInvoiceDetails=parseInvoiceDetails(invoiceIssueDetails);
        // // Customer details in JSON format
        // let parsedCustomerDetails=parseCustomerDetails(customerDetails);
        
        // // Contains data for all the fields before the item wise bill details of invoice
        // let responseFragment1={
        //   bussiness_city: parsedBusinessAddress.city,
        //   bussiness_country: parsedBusinessAddress.country,
        //   businessDescription: businessDescription,
        //   businessName: businessName,
        //   business_street: parsedBusinessAddress.street,
        //   business_zipcode: parsedBusinessAddress.zipcode,
        //   customerAddressLine1: parsedCustomerDetails.addressLine1,
        //   customerAddressLine2: parsedCustomerDetails.addressLine2,
        //   customerEmail: parsedCustomerDetails.email,
        //   customerName: parsedCustomerDetails.name,
        //   customerPhoneNo: parsedCustomerDetails.phoneNo,
        // }

        // // Contains data for all the fields after the item wise bill details of invoice 
        // let responesFragment2={
        //   invoiceDescription: invoiceDescription,
        //   invoiceDueDate: invoiceDueDate,
        //   invoiceIssueDate: parsedInvoiceDetails.issuedDate,
        //   invoiceNumber: parsedInvoiceDetails.invoiceNumber,
        //   invoiceTax: invoiceTax,
        // }

        // // NOTE: The fragments above are the properties common for all the items in the invoice

        // // Merging fragment1 and fragment2 with the item property in the fashion
        // // fragment1 + itemPropery('element' in this case) + fragment2
        // invoiceBillDetails.forEach(element => {
        //     let indivdualItemResponse={
        //         ...responseFragment1,
        //         ...element,
        //         ...responesFragment2
        //     };
        //     this.collectiveParsedReponse.push(indivdualItemResponse);
        // });
    }

}

// module.exports = Parser;





const jsonData = {
    "version": {
        "json_export": "187",
        "page_segmentation": "5",
        "schema": "1.1.0",
        "structure": "1.1036.0",
        "table_structure": "5"
    },
    "extended_metadata": {
        "ID_instance": "90 71 C1 54 3D B7 B2 11 0A 00 67 45 8B 6B C6 23 ",
        "ID_permanent": "34 35 20 37 33 20 42 39 20 35 34 20 33 44 20 42 37 20 42 32 20 31 31 20 30 41 20 30 30 20 36 37 20 34 35 20 38 42 20 36 42 20 43 36 20 32 33 20 ",
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
                "name": "VKZCMH+Arial-BoldMT",
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
                "name": "EINEIP+ArialMT",
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
                "name": "EINEIP+ArialMT",
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
                "name": "EINEIP+ArialMT",
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
                336.07000732421875,
                708.1132049560547,
                543.2117614746094,
                730.5582427978516
            ],
            "ClipBounds": [
                336.07000732421875,
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
                "name": "VKZCMH+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect/P[3]",
            "Text": "Invoice# FR872290774839BQSM7IYG2JL13 Issue date ",
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
                "name": "EINEIP+ArialMT",
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
                "SpaceAfter": 12.625,
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
                "name": "EINEIP+ArialMT",
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
                "name": "EINEIP+ArialMT",
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
                "name": "VKZCMH+Arial-BoldMT",
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
                143.38272094726562,
                577.1182403564453
            ],
            "ClipBounds": [
                81.04800415039062,
                567.6631927490234,
                143.38272094726562,
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect[2]/P/Sub",
            "Text": "Willis Koelpin ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "Placement": "Block"
            }
        },
        {
            "Bounds": [
                81.04800415039062,
                554.6831970214844,
                202.37088012695312,
                564.1382446289062
            ],
            "ClipBounds": [
                81.04800415039062,
                554.6831970214844,
                202.37088012695312,
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect[2]/P/Sub[2]",
            "Text": "Willis_Koelpin4@yahoo.co ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "Placement": "Block"
            }
        },
        {
            "Bounds": [
                81.04800415039062,
                541.3632049560547,
                92.24681091308594,
                550.8182373046875
            ],
            "ClipBounds": [
                81.04800415039062,
                541.3632049560547,
                92.24681091308594,
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect[2]/P/Sub[3]",
            "Text": "m ",
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect[2]/P/Sub[4]",
            "Text": "783-402-5895 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "Placement": "Block"
            }
        },
        {
            "Bounds": [
                81.04800415039062,
                514.7232055664062,
                158.63375854492188,
                524.1782379150391
            ],
            "ClipBounds": [
                81.04800415039062,
                514.7232055664062,
                158.63375854492188,
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect[2]/P/Sub[5]",
            "Text": "353 Cara Shoals ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "Placement": "Block"
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Page": 0,
            "Path": "//Document/Sect[2]/P/Sub[6]",
            "Text": "Suchitlán ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "Placement": "Block"
            }
        },
        {
            "Bounds": [
                240.25999450683594,
                514.7232055664062,
                513.0480804443359,
                590.438232421875
            ],
            "ClipBounds": [
                240.25999450683594,
                514.7232055664062,
                513.0480804443359,
                590.438232421875
            ],
            "Page": 0,
            "Path": "//Document/Sect[2]/Table",
            "attributes": {
                "BBox": [
                    240.22999999999593,
                    514.6909999999916,
                    558.2169999999751,
                    588.9679999999935
                ],
                "NumCol": 2,
                "NumRow": 2,
                "Placement": "Block",
                "SpaceAfter": 18
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
            "Page": 0,
            "Path": "//Document/Sect[2]/Table/TR/TH",
            "attributes": {
                "BBox": [
                    240.22999999999593,
                    579.6089999999967,
                    403.903999999995,
                    588.9679999999935
                ],
                "BlockAlign": "Before",
                "ColIndex": 0,
                "Height": 9.375,
                "InlineAlign": "Start",
                "RowIndex": 0,
                "Width": 163.625
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
                "name": "VKZCMH+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table/TR/TH/P",
            "Text": "DETAILS ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
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
            "Page": 0,
            "Path": "//Document/Sect[2]/Table/TR/TH[2]",
            "attributes": {
                "BBox": [
                    403.903999999995,
                    579.6089999999967,
                    558.2169999999751,
                    588.9679999999935
                ],
                "BlockAlign": "Before",
                "ColIndex": 1,
                "Height": 9.375,
                "InlineAlign": "Start",
                "RowIndex": 0,
                "Width": 154.375
            }
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
                "name": "VKZCMH+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table/TR/TH[2]/P",
            "Text": "PAYMENT ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                240.25999450683594,
                514.7232055664062,
                368.3263244628906,
                577.1182403564453
            ],
            "ClipBounds": [
                240.25999450683594,
                514.7232055664062,
                368.3263244628906,
                577.1182403564453
            ],
            "Page": 0,
            "Path": "//Document/Sect[2]/Table/TR[2]/TD",
            "attributes": {
                "BBox": [
                    240.22999999999593,
                    514.6909999999916,
                    403.903999999995,
                    579.6089999999967
                ],
                "BlockAlign": "After",
                "ColIndex": 0,
                "Height": 64.875,
                "InlineAlign": "Start",
                "RowIndex": 1,
                "Width": 163.625
            }
        },
        {
            "Bounds": [
                240.25999450683594,
                514.7232055664062,
                368.3263244628906,
                577.1182403564453
            ],
            "ClipBounds": [
                240.25999450683594,
                514.7232055664062,
                368.3263244628906,
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table/TR[2]/TD/P",
            "Text": "tempor tempor mollit tempor id occaecat consequat id pariatur nulla ullamco deserunt non fugiat consectetur fugiat ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 13.25
            }
        },
        {
            "Bounds": [
                410.63999938964844,
                535.3764038085938,
                513.0480804443359,
                577.1182403564453
            ],
            "ClipBounds": [
                410.63999938964844,
                535.3764038085938,
                513.0480804443359,
                577.1182403564453
            ],
            "Page": 0,
            "Path": "//Document/Sect[2]/Table/TR[2]/TD[2]",
            "attributes": {
                "BBox": [
                    403.903999999995,
                    514.6909999999916,
                    558.2169999999751,
                    579.6089999999967
                ],
                "BlockAlign": "Before",
                "ColIndex": 1,
                "Height": 64.875,
                "InlineAlign": "Start",
                "RowIndex": 1,
                "Width": 154.375
            }
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table/TR[2]/TD[2]/P",
            "Text": "Due date: 18-06-2023 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
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
                "name": "VKZCMH+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table/TR[2]/TD[2]/P[2]",
            "Text": "$21161.8 ",
            "TextSize": 11.160003662109375,
            "attributes": {
                "LineHeight": 13.375
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
            "Path": "//Document/Sect[2]/Table[2]",
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
            "Path": "//Document/Sect[2]/Table[2]/TR/TD",
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
                "name": "VKZCMH+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[2]/TR/TD/P",
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
            "Path": "//Document/Sect[2]/Table[2]/TR/TD[2]",
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
                "name": "VKZCMH+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[2]/TR/TD[2]/P",
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
            "Path": "//Document/Sect[2]/Table[2]/TR/TD[3]",
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
                "name": "VKZCMH+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[2]/TR/TD[3]/P",
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
            "Path": "//Document/Sect[2]/Table[2]/TR/TD[4]",
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
                "name": "VKZCMH+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[2]/TR/TD[4]/P",
            "Text": "AMOUNT ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                193.0731964111328,
                517.7280731201172,
                403.50823974609375
            ],
            "ClipBounds": [
                77.447998046875,
                193.0731964111328,
                517.7280731201172,
                403.50823974609375
            ],
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    175.70499999999447,
                    540.9379999999946,
                    411.97499999999127
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
                394.05320739746094,
                181.5038299560547,
                403.50823974609375
            ],
            "ClipBounds": [
                77.447998046875,
                394.05320739746094,
                181.5038299560547,
                403.50823974609375
            ],
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    376.33699999999953,
                    358.0649999999878,
                    411.97499999999127
                ],
                "BlockAlign": "Before",
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
                "Height": 35.625,
                "InlineAlign": "Start",
                "RowIndex": 0,
                "Width": 286.375
            }
        },
        {
            "Bounds": [
                77.447998046875,
                394.05320739746094,
                181.5038299560547,
                403.50823974609375
            ],
            "ClipBounds": [
                77.447998046875,
                394.05320739746094,
                181.5038299560547,
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR/TD/P",
            "Text": "Ergonomic Metal Soap ",
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
            "Path": "//Document/Sect[2]/Table[3]/TR/TD[2]",
            "attributes": {
                "BBox": [
                    357.58499999999185,
                    376.33699999999953,
                    414.22299999999814,
                    411.97499999999127
                ],
                "BlockAlign": "Before",
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
                "Height": 35.625,
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR/TD[2]/P",
            "Text": "73 ",
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
            "Path": "//Document/Sect[2]/Table[3]/TR/TD[3]",
            "attributes": {
                "BBox": [
                    413.74299999998766,
                    376.33699999999953,
                    481.8999999999942,
                    411.97499999999127
                ],
                "BlockAlign": "Before",
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
                "Height": 35.625,
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR/TD[3]/P",
            "Text": "54 ",
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
            "Path": "//Document/Sect[2]/Table[3]/TR/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    376.33699999999953,
                    541.417999999976,
                    411.97499999999127
                ],
                "BlockAlign": "Before",
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
                "Height": 35.625,
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR/TD[4]/P",
            "Text": "$3942 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                360.5731964111328,
                167.1196746826172,
                370.0282440185547
            ],
            "ClipBounds": [
                77.447998046875,
                360.5731964111328,
                167.1196746826172,
                370.0282440185547
            ],
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[2]/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    343.2179999999935,
                    358.0649999999878,
                    376.81699999999546
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
                "RowIndex": 1,
                "Width": 286.375
            }
        },
        {
            "Bounds": [
                77.447998046875,
                360.5731964111328,
                167.1196746826172,
                370.0282440185547
            ],
            "ClipBounds": [
                77.447998046875,
                360.5731964111328,
                167.1196746826172,
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[2]/TD/P",
            "Text": "Sleek Granite Soap ",
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
            "Path": "//Document/Sect[2]/Table[3]/TR[2]/TD[2]",
            "attributes": {
                "BBox": [
                    357.58499999999185,
                    343.2179999999935,
                    414.22299999999814,
                    376.81699999999546
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[2]/TD[2]/P",
            "Text": "17 ",
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
            "Path": "//Document/Sect[2]/Table[3]/TR[2]/TD[3]",
            "attributes": {
                "BBox": [
                    413.74299999998766,
                    343.2179999999935,
                    481.8999999999942,
                    376.81699999999546
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[2]/TD[3]/P",
            "Text": "63 ",
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
            "Path": "//Document/Sect[2]/Table[3]/TR[2]/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    343.2179999999935,
                    541.417999999976,
                    376.81699999999546
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[2]/TD[4]/P",
            "Text": "$1071 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                327.0632019042969,
                178.61087036132812,
                336.5182342529297
            ],
            "ClipBounds": [
                77.447998046875,
                327.0632019042969,
                178.61087036132812,
                336.5182342529297
            ],
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[3]/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    310.09999999999127,
                    358.0649999999878,
                    343.6979999999894
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
                327.0632019042969,
                178.61087036132812,
                336.5182342529297
            ],
            "ClipBounds": [
                77.447998046875,
                327.0632019042969,
                178.61087036132812,
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[3]/TD/P",
            "Text": "Fantastic Soft Cheese ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                327.0632019042969,
                378.3000030517578,
                336.5182342529297
            ],
            "ClipBounds": [
                363.82000732421875,
                327.0632019042969,
                378.3000030517578,
                336.5182342529297
            ],
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[3]/TD[2]",
            "attributes": {
                "BBox": [
                    357.58499999999185,
                    310.09999999999127,
                    414.22299999999814,
                    343.6979999999894
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
                327.0632019042969,
                378.3000030517578,
                336.5182342529297
            ],
            "ClipBounds": [
                363.82000732421875,
                327.0632019042969,
                378.3000030517578,
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[3]/TD[2]/P",
            "Text": "36 ",
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
            "Path": "//Document/Sect[2]/Table[3]/TR[3]/TD[3]",
            "attributes": {
                "BBox": [
                    413.74299999998766,
                    310.09999999999127,
                    481.8999999999942,
                    343.6979999999894
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[3]/TD[3]/P",
            "Text": "78 ",
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
            "Path": "//Document/Sect[2]/Table[3]/TR[3]/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    310.09999999999127,
                    541.417999999976,
                    343.6979999999894
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[3]/TD[4]/P",
            "Text": "$2808 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                293.5632019042969,
                180.80831909179688,
                303.0182342529297
            ],
            "ClipBounds": [
                77.447998046875,
                293.5632019042969,
                180.80831909179688,
                303.0182342529297
            ],
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[4]/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    276.2609999999986,
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
                "Height": 34.375,
                "InlineAlign": "Start",
                "RowIndex": 3,
                "Width": 286.375
            }
        },
        {
            "Bounds": [
                77.447998046875,
                293.5632019042969,
                180.80831909179688,
                303.0182342529297
            ],
            "ClipBounds": [
                77.447998046875,
                293.5632019042969,
                180.80831909179688,
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[4]/TD/P",
            "Text": "Gorgeous Fresh Salad ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                293.5632019042969,
                372.2267150878906,
                303.0182342529297
            ],
            "ClipBounds": [
                363.82000732421875,
                293.5632019042969,
                372.2267150878906,
                303.0182342529297
            ],
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[4]/TD[2]",
            "attributes": {
                "BBox": [
                    357.58499999999185,
                    276.2609999999986,
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
                "Height": 34.375,
                "InlineAlign": "Start",
                "RowIndex": 3,
                "Width": 56.625
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                293.5632019042969,
                372.2267150878906,
                303.0182342529297
            ],
            "ClipBounds": [
                363.82000732421875,
                293.5632019042969,
                372.2267150878906,
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[4]/TD[2]/P",
            "Text": "9 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                293.5632019042969,
                434.86000061035156,
                303.0182342529297
            ],
            "ClipBounds": [
                420.3800048828125,
                293.5632019042969,
                434.86000061035156,
                303.0182342529297
            ],
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[4]/TD[3]",
            "attributes": {
                "BBox": [
                    413.74299999998766,
                    276.2609999999986,
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
                "Height": 34.375,
                "InlineAlign": "Start",
                "RowIndex": 3,
                "Width": 68.125
            }
        },
        {
            "Bounds": [
                420.3800048828125,
                293.5632019042969,
                434.86000061035156,
                303.0182342529297
            ],
            "ClipBounds": [
                420.3800048828125,
                293.5632019042969,
                434.86000061035156,
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[4]/TD[3]/P",
            "Text": "45 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                293.5632019042969,
                512.3251953125,
                303.0182342529297
            ],
            "ClipBounds": [
                487.00999450683594,
                293.5632019042969,
                512.3251953125,
                303.0182342529297
            ],
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[4]/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    276.2609999999986,
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
                "Height": 34.375,
                "InlineAlign": "Start",
                "RowIndex": 3,
                "Width": 60
            }
        },
        {
            "Bounds": [
                487.00999450683594,
                293.5632019042969,
                512.3251953125,
                303.0182342529297
            ],
            "ClipBounds": [
                487.00999450683594,
                293.5632019042969,
                512.3251953125,
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[4]/TD[4]/P",
            "Text": "$405 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                260.0832061767578,
                159.95278930664062,
                269.5382385253906
            ],
            "ClipBounds": [
                77.447998046875,
                260.0832061767578,
                159.95278930664062,
                269.5382385253906
            ],
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[5]/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    243.14199999999983,
                    358.0649999999878,
                    276.74099999999453
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
                "RowIndex": 4,
                "Width": 286.375
            }
        },
        {
            "Bounds": [
                77.447998046875,
                260.0832061767578,
                159.95278930664062,
                269.5382385253906
            ],
            "ClipBounds": [
                77.447998046875,
                260.0832061767578,
                159.95278930664062,
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[5]/TD/P",
            "Text": "Sleek Metal Pizza ",
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
            "Path": "//Document/Sect[2]/Table[3]/TR[5]/TD[2]",
            "attributes": {
                "BBox": [
                    357.58499999999185,
                    243.14199999999983,
                    414.22299999999814,
                    276.74099999999453
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[5]/TD[2]/P",
            "Text": "36 ",
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
            "Path": "//Document/Sect[2]/Table[3]/TR[5]/TD[3]",
            "attributes": {
                "BBox": [
                    413.74299999998766,
                    243.14199999999983,
                    481.8999999999942,
                    276.74099999999453
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[5]/TD[3]/P",
            "Text": "64 ",
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
            "Path": "//Document/Sect[2]/Table[3]/TR[5]/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    243.14199999999983,
                    541.417999999976,
                    276.74099999999453
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[5]/TD[4]/P",
            "Text": "$2304 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                226.5832061767578,
                191.94671630859375,
                236.03823852539062
            ],
            "ClipBounds": [
                77.447998046875,
                226.5832061767578,
                191.94671630859375,
                236.03823852539062
            ],
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[6]/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    210.0239999999976,
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
                "Height": 33.625,
                "InlineAlign": "Start",
                "RowIndex": 5,
                "Width": 286.375
            }
        },
        {
            "Bounds": [
                77.447998046875,
                226.5832061767578,
                191.94671630859375,
                236.03823852539062
            ],
            "ClipBounds": [
                77.447998046875,
                226.5832061767578,
                191.94671630859375,
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[6]/TD/P",
            "Text": "Ergonomic Rubber Salad ",
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
            "Path": "//Document/Sect[2]/Table[3]/TR[6]/TD[2]",
            "attributes": {
                "BBox": [
                    357.58499999999185,
                    210.0239999999976,
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
                "Height": 33.625,
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[6]/TD[2]/P",
            "Text": "42 ",
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
            "Path": "//Document/Sect[2]/Table[3]/TR[6]/TD[3]",
            "attributes": {
                "BBox": [
                    413.74299999998766,
                    210.0239999999976,
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
                "Height": 33.625,
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[6]/TD[3]/P",
            "Text": "99 ",
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
            "Path": "//Document/Sect[2]/Table[3]/TR[6]/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    210.0239999999976,
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
                "Height": 33.625,
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[6]/TD[4]/P",
            "Text": "$4158 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                193.0731964111328,
                195.95855712890625,
                202.5282440185547
            ],
            "ClipBounds": [
                77.447998046875,
                193.0731964111328,
                195.95855712890625,
                202.5282440185547
            ],
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[7]/TD",
            "attributes": {
                "BBox": [
                    71.5170999999973,
                    175.10499999999593,
                    358.0649999999878,
                    210.50399999999354
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
                "RowIndex": 6,
                "Width": 286.375
            }
        },
        {
            "Bounds": [
                77.447998046875,
                193.0731964111328,
                195.95855712890625,
                202.5282440185547
            ],
            "ClipBounds": [
                77.447998046875,
                193.0731964111328,
                195.95855712890625,
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[7]/TD/P",
            "Text": "Handmade Concrete Shirt ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                193.0731964111328,
                383.3751983642578,
                202.5282440185547
            ],
            "ClipBounds": [
                363.82000732421875,
                193.0731964111328,
                383.3751983642578,
                202.5282440185547
            ],
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[7]/TD[2]",
            "attributes": {
                "BBox": [
                    357.58499999999185,
                    175.10499999999593,
                    414.22299999999814,
                    210.50399999999354
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
                "RowIndex": 6,
                "Width": 56.625
            }
        },
        {
            "Bounds": [
                363.82000732421875,
                193.0731964111328,
                383.3751983642578,
                202.5282440185547
            ],
            "ClipBounds": [
                363.82000732421875,
                193.0731964111328,
                383.3751983642578,
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[7]/TD[2]/P",
            "Text": "130 ",
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
            "Path": "//Document/Sect[2]/Table[3]/TR[7]/TD[3]",
            "attributes": {
                "BBox": [
                    413.74299999998766,
                    175.10499999999593,
                    481.8999999999942,
                    210.50399999999354
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[7]/TD[3]/P",
            "Text": "35 ",
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
            "Path": "//Document/Sect[2]/Table[3]/TR[7]/TD[4]",
            "attributes": {
                "BBox": [
                    481.41999999999825,
                    175.10499999999593,
                    541.417999999976,
                    210.50399999999354
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/Table[3]/TR[7]/TD[4]/P",
            "Text": "$4550 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "LineHeight": 12.125
            }
        },
        {
            "Bounds": [
                77.447998046875,
                113.13319396972656,
                120.4593505859375,
                122.58824157714844
            ],
            "ClipBounds": [
                77.447998046875,
                113.13319396972656,
                120.4593505859375,
                122.58824157714844
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "VKZCMH+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/P[2]",
            "Text": "Subtotal ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "SpaceAfter": 18
            }
        },
        {
            "Bounds": [
                485.92999267578125,
                113.13319396972656,
                522.3792724609375,
                122.58824157714844
            ],
            "ClipBounds": [
                485.92999267578125,
                113.13319396972656,
                522.3792724609375,
                122.58824157714844
            ],
            "Font": {
                "alt_family_name": "Arial",
                "embedded": true,
                "encoding": "WinAnsiEncoding",
                "family_name": "Arial MT",
                "font_type": "TrueType",
                "italic": false,
                "monospaced": false,
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 0,
            "Path": "//Document/Sect[2]/P[3]",
            "Text": "$19238 ",
            "TextSize": 10.080001831054688
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
                "name": "VKZCMH+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 1,
            "Path": "//Document/Sect[2]/P[4]",
            "Text": "Tax % ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "SpaceAfter": 9
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 1,
            "Path": "//Document/Sect[2]/P[5]",
            "Text": "10 ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "SpaceAfter": 9
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
                "name": "VKZCMH+Arial-BoldMT",
                "subset": true,
                "weight": 700
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 1,
            "Path": "//Document/Sect[2]/P[6]",
            "Text": "Total Due ",
            "TextSize": 10.080001831054688,
            "attributes": {
                "SpaceAfter": 9
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
                "name": "EINEIP+ArialMT",
                "subset": true,
                "weight": 400
            },
            "HasClip": true,
            "Lang": "en",
            "Page": 1,
            "Path": "//Document/Sect[2]/P[7]",
            "Text": "$21161.8 ",
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

let parser=new Parser();
parser.parseApiResponse(jsonData);