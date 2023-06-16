
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

function parseInvoiceNumberAndIssueDate(data){
    data=data.replace("Invoice# ","");
    data=data.replace("Issue date ","");
    data=data.trim();
    let dataArray=data.split(" ");
    let issueDateString=dataArray.pop().trim();
    let dateParts=issueDateString.split("-");
    let issueDate=new Date(dateParts[2], (dateParts[1] - 1), dateParts[0]);
    let invoiceNumber=dataArray.pop().trim();
    return {
        "invoiceNumber": invoiceNumber,
        "issueDate": issueDateString
    };

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

function parseCustomerDetails(data){
    let name="";
    let email="";
    let phoneNumber="";
    let addressLine1="";
    let addressLine2="";

    data.replace("BILL TO ","");
    let dataArray=data.split(" ");
    let i=0;
    while(!(dataArray[i].includes("@"))){
        name+=dataArray.shift()+" ";
    }

    while(!(dataArray[i][3]==="-" && dataArray[i][7]==="-")){
        email+=dataArray.shift();
    }

    phoneNumber=dataArray.shift();
    addressLine1=dataArray.shift()+" "+dataArray.shift()+" "+dataArray.shift();
    while(dataArray.length>0){
        addressLine2+=dataArray.shift();
    }

    return {
        "name": name.trim(),
        "email": email.trim(),
        "phoneNo": phoneNumber.trim(),
        "addressLine1": addressLine1.trim(),
        "addressLine2": addressLine2.trim()
    };

}





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
        let invoiceTax;

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
        invoiceDescriptionString.replace("DETAILS ","");

        while(i<json.elements.length){
            if(json.elements[i].Font!== undefined && json.elements[i].Font.family_name === "Arial MT")
            itemTableData.push(json.elements[i].Text.trim());
            i++;
        }
        itemTableData.pop();
        invoiceTax=Number(itemTableData.pop());
        itemTableData.pop();


        let parsedBillItemDetails=parseBillItemDetails(itemTableData);
        let parsedCustomerDetails=parseCustomerDetails(customerDetailsString);
        let parsedInvoiceNumberAndIssueDate=parseInvoiceNumberAndIssueDate(invoiceNumberAndIssueDateString);
        let parsedBusinessAddress=parseBusinessAddress(businessAddressText);

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


// const jsonData = {
//     "version": {
//         "json_export": "187",
//         "page_segmentation": "5",
//         "schema": "1.1.0",
//         "structure": "1.1036.0",
//         "table_structure": "5"
//     },
//     "extended_metadata": {
//         "ID_instance": "39 51 32 BF 3E B7 B2 11 0A 00 67 45 8B 6B C6 23 ",
//         "ID_permanent": "46 43 20 37 45 20 32 46 20 42 46 20 33 45 20 42 37 20 42 32 20 31 31 20 30 41 20 30 30 20 36 37 20 34 35 20 38 42 20 36 42 20 43 36 20 32 33 20 ",
//         "pdf_version": "1.6",
//         "pdfa_compliance_level": "",
//         "is_encrypted": false,
//         "has_acroform": false,
//         "is_digitally_signed": false,
//         "pdfua_compliance_level": "",
//         "page_count": 1,
//         "has_embedded_files": false,
//         "is_certified": false,
//         "is_XFA": false,
//         "language": "en-US"
//     },
//     "elements": [
//         {
//             "Bounds": [
//                 76.72799682617188,
//                 734.4232025146484,
//                 171.43968200683594,
//                 743.8782348632812
//             ],
//             "ClipBounds": [
//                 76.72799682617188,
//                 734.4232025146484,
//                 171.43968200683594,
//                 743.8782348632812
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "XHPPCY+Arial-BoldMT",
//                 "subset": true,
//                 "weight": 700
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/P",
//             "Text": "NearBy Electronics ",
//             "TextSize": 10.080001831054688
//         },
//         {
//             "Bounds": [
//                 76.72799682617188,
//                 721.1031951904297,
//                 214.52447509765625,
//                 730.5582427978516
//             ],
//             "ClipBounds": [
//                 76.72799682617188,
//                 721.1031951904297,
//                 214.52447509765625,
//                 730.5582427978516
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Page": 0,
//             "Path": "//Document/Sect/P[2]/Sub",
//             "Text": "3741 Glory Road, Jamestown, ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "Placement": "Block"
//             }
//         },
//         {
//             "Bounds": [
//                 76.72799682617188,
//                 708.1132049560547,
//                 155.30166625976562,
//                 717.5682373046875
//             ],
//             "ClipBounds": [
//                 76.72799682617188,
//                 708.1132049560547,
//                 155.30166625976562,
//                 717.5682373046875
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Page": 0,
//             "Path": "//Document/Sect/P[2]/Sub[2]",
//             "Text": "Tennessee, USA ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "Placement": "Block"
//             }
//         },
//         {
//             "Bounds": [
//                 76.72799682617188,
//                 694.7931976318359,
//                 107.43167114257812,
//                 704.2482452392578
//             ],
//             "ClipBounds": [
//                 76.72799682617188,
//                 694.7931976318359,
//                 107.43167114257812,
//                 704.2482452392578
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Page": 0,
//             "Path": "//Document/Sect/P[2]/Sub[3]",
//             "Text": "38556 ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "Placement": "Block"
//             }
//         },
//         {
//             "Bounds": [
//                 334.99000549316406,
//                 708.1132049560547,
//                 543.2117614746094,
//                 730.5582427978516
//             ],
//             "ClipBounds": [
//                 334.99000549316406,
//                 708.1132049560547,
//                 543.2117614746094,
//                 730.5582427978516
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "XHPPCY+Arial-BoldMT",
//                 "subset": true,
//                 "weight": 700
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/P[3]",
//             "Text": "Invoice# TG04EM6808839862502629422968 Issue date ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 13,
//                 "TextAlign": "End"
//             }
//         },
//         {
//             "Bounds": [
//                 489.1699981689453,
//                 694.7931976318359,
//                 543.3080749511719,
//                 704.2482452392578
//             ],
//             "ClipBounds": [
//                 489.1699981689453,
//                 694.7931976318359,
//                 543.3080749511719,
//                 704.2482452392578
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/P[4]",
//             "Text": "12-05-2023 ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125,
//                 "SpaceAfter": 6.625,
//                 "TextAlign": "End"
//             }
//         },
//         {
//             "Bounds": [
//                 76.72799682617188,
//                 649.9085540771484,
//                 295.7052459716797,
//                 673.2309875488281
//             ],
//             "ClipBounds": [
//                 76.72799682617188,
//                 649.9085540771484,
//                 295.7052459716797,
//                 673.2309875488281
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Title",
//             "Text": "NearBy Electronics ",
//             "TextSize": 24.863998413085938,
//             "attributes": {
//                 "LineHeight": 29.875,
//                 "SpaceAfter": 7
//             }
//         },
//         {
//             "Bounds": [
//                 76.72799682617188,
//                 633.9331970214844,
//                 460.8868713378906,
//                 643.3882446289062
//             ],
//             "ClipBounds": [
//                 76.72799682617188,
//                 633.9331970214844,
//                 460.8868713378906,
//                 643.3882446289062
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/P[5]",
//             "Text": "We are here to serve you better. Reach out to us in case of any concern or feedbacks. ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "SpaceAfter": 18
//             }
//         },
//         {
//             "Bounds": [
//                 81.04800415039062,
//                 501.7431945800781,
//                 513.0480804443359,
//                 590.438232421875
//             ],
//             "ClipBounds": [
//                 81.04800415039062,
//                 501.7431945800781,
//                 513.0480804443359,
//                 590.438232421875
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table",
//             "attributes": {
//                 "BBox": [
//                     80.99669999999969,
//                     501.73199999998906,
//                     558.2169999999751,
//                     588.9679999999935
//                 ],
//                 "NumCol": 3,
//                 "NumRow": 2,
//                 "Placement": "Block",
//                 "SpaceAfter": 18
//             }
//         },
//         {
//             "Bounds": [
//                 81.04800415039062,
//                 580.9832000732422,
//                 122.99087524414062,
//                 590.438232421875
//             ],
//             "ClipBounds": [
//                 81.04800415039062,
//                 580.9832000732422,
//                 122.99087524414062,
//                 590.438232421875
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table/TR/TH",
//             "attributes": {
//                 "BBox": [
//                     80.99669999999969,
//                     580.3289999999979,
//                     221.0309999999954,
//                     588.9679999999935
//                 ],
//                 "BlockAlign": "Before",
//                 "ColIndex": 0,
//                 "Height": 8.625,
//                 "InlineAlign": "Start",
//                 "RowIndex": 0,
//                 "Width": 140
//             }
//         },
//         {
//             "Bounds": [
//                 81.04800415039062,
//                 580.9832000732422,
//                 122.99087524414062,
//                 590.438232421875
//             ],
//             "ClipBounds": [
//                 81.04800415039062,
//                 580.9832000732422,
//                 122.99087524414062,
//                 590.438232421875
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "XHPPCY+Arial-BoldMT",
//                 "subset": true,
//                 "weight": 700
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table/TR/TH/P",
//             "Text": "BILL TO ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 240.25999450683594,
//                 580.9832000732422,
//                 286.1240692138672,
//                 590.438232421875
//             ],
//             "ClipBounds": [
//                 240.25999450683594,
//                 580.9832000732422,
//                 286.1240692138672,
//                 590.438232421875
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table/TR/TH[2]",
//             "attributes": {
//                 "BBox": [
//                     221.0309999999954,
//                     580.3289999999979,
//                     403.903999999995,
//                     588.9679999999935
//                 ],
//                 "BlockAlign": "Before",
//                 "ColIndex": 1,
//                 "Height": 8.625,
//                 "InlineAlign": "Start",
//                 "RowIndex": 0,
//                 "Width": 182.875
//             }
//         },
//         {
//             "Bounds": [
//                 240.25999450683594,
//                 580.9832000732422,
//                 286.1240692138672,
//                 590.438232421875
//             ],
//             "ClipBounds": [
//                 240.25999450683594,
//                 580.9832000732422,
//                 286.1240692138672,
//                 590.438232421875
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "XHPPCY+Arial-BoldMT",
//                 "subset": true,
//                 "weight": 700
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table/TR/TH[2]/P",
//             "Text": "DETAILS ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 412.8000030517578,
//                 580.9832000732422,
//                 464.58103942871094,
//                 590.438232421875
//             ],
//             "ClipBounds": [
//                 412.8000030517578,
//                 580.9832000732422,
//                 464.58103942871094,
//                 590.438232421875
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table/TR/TH[3]",
//             "attributes": {
//                 "BBox": [
//                     403.903999999995,
//                     580.3289999999979,
//                     558.2169999999751,
//                     588.9679999999935
//                 ],
//                 "BlockAlign": "Before",
//                 "ColIndex": 2,
//                 "Height": 8.625,
//                 "InlineAlign": "Start",
//                 "RowIndex": 0,
//                 "Width": 154.375
//             }
//         },
//         {
//             "Bounds": [
//                 412.8000030517578,
//                 580.9832000732422,
//                 464.58103942871094,
//                 590.438232421875
//             ],
//             "ClipBounds": [
//                 412.8000030517578,
//                 580.9832000732422,
//                 464.58103942871094,
//                 590.438232421875
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "XHPPCY+Arial-BoldMT",
//                 "subset": true,
//                 "weight": 700
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table/TR/TH[3]/P",
//             "Text": "PAYMENT ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 81.04800415039062,
//                 501.7431945800781,
//                 204.6892852783203,
//                 577.1182403564453
//             ],
//             "ClipBounds": [
//                 81.04800415039062,
//                 501.7431945800781,
//                 204.6892852783203,
//                 577.1182403564453
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table/TR[2]/TD",
//             "attributes": {
//                 "BBox": [
//                     80.99669999999969,
//                     501.73199999998906,
//                     221.0309999999954,
//                     580.3289999999979
//                 ],
//                 "BlockAlign": "After",
//                 "ColIndex": 0,
//                 "Height": 78.625,
//                 "InlineAlign": "Start",
//                 "RowIndex": 1,
//                 "Width": 140
//             }
//         },
//         {
//             "Bounds": [
//                 81.04800415039062,
//                 528.0431976318359,
//                 204.6892852783203,
//                 577.1182403564453
//             ],
//             "ClipBounds": [
//                 81.04800415039062,
//                 528.0431976318359,
//                 204.6892852783203,
//                 577.1182403564453
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Page": 0,
//             "Path": "//Document/Sect/Table/TR[2]/TD/P/Sub",
//             "Text": "Kerry Bergnaum Kerry_Bergnaum@yahoo.c om 189-052-5595 ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "Placement": "Block"
//             }
//         },
//         {
//             "Bounds": [
//                 81.04800415039062,
//                 501.7431945800781,
//                 178.63247680664062,
//                 524.1782379150391
//             ],
//             "ClipBounds": [
//                 81.04800415039062,
//                 501.7431945800781,
//                 178.63247680664062,
//                 524.1782379150391
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Page": 0,
//             "Path": "//Document/Sect/Table/TR[2]/TD/P/Sub[2]",
//             "Text": "7470 DuBuque Plaza Oranjestad ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "Placement": "Block"
//             }
//         },
//         {
//             "Bounds": [
//                 240.25999450683594,
//                 541.3632049560547,
//                 371.693115234375,
//                 577.1182403564453
//             ],
//             "ClipBounds": [
//                 240.25999450683594,
//                 541.3632049560547,
//                 371.693115234375,
//                 577.1182403564453
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table/TR[2]/TD[2]",
//             "attributes": {
//                 "BBox": [
//                     221.0309999999954,
//                     501.73199999998906,
//                     403.903999999995,
//                     580.3289999999979
//                 ],
//                 "BlockAlign": "Before",
//                 "ColIndex": 1,
//                 "Height": 78.625,
//                 "InlineAlign": "Start",
//                 "RowIndex": 1,
//                 "Width": 182.875
//             }
//         },
//         {
//             "Bounds": [
//                 240.25999450683594,
//                 541.3632049560547,
//                 371.693115234375,
//                 577.1182403564453
//             ],
//             "ClipBounds": [
//                 240.25999450683594,
//                 541.3632049560547,
//                 371.693115234375,
//                 577.1182403564453
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table/TR[2]/TD[2]/P",
//             "Text": "eiusmod dolor tempor et velit laboris labore ipsum anim voluptate ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 13.125
//             }
//         },
//         {
//             "Bounds": [
//                 410.63999938964844,
//                 535.3764038085938,
//                 513.0480804443359,
//                 577.1182403564453
//             ],
//             "ClipBounds": [
//                 410.63999938964844,
//                 535.3764038085938,
//                 513.0480804443359,
//                 577.1182403564453
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table/TR[2]/TD[3]",
//             "attributes": {
//                 "BBox": [
//                     403.903999999995,
//                     501.73199999998906,
//                     558.2169999999751,
//                     580.3289999999979
//                 ],
//                 "BlockAlign": "Before",
//                 "ColIndex": 2,
//                 "Height": 78.625,
//                 "InlineAlign": "Start",
//                 "RowIndex": 1,
//                 "Width": 154.375
//             }
//         },
//         {
//             "Bounds": [
//                 412.8000030517578,
//                 567.6631927490234,
//                 513.0480804443359,
//                 577.1182403564453
//             ],
//             "ClipBounds": [
//                 412.8000030517578,
//                 567.6631927490234,
//                 513.0480804443359,
//                 577.1182403564453
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table/TR[2]/TD[3]/P",
//             "Text": "Due date: 14-06-2023 ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 410.63999938964844,
//                 535.3764038085938,
//                 459.87107849121094,
//                 545.844482421875
//             ],
//             "ClipBounds": [
//                 410.63999938964844,
//                 535.3764038085938,
//                 459.87107849121094,
//                 545.844482421875
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "XHPPCY+Arial-BoldMT",
//                 "subset": true,
//                 "weight": 700
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table/TR[2]/TD[3]/P[2]",
//             "Text": "$24215.4 ",
//             "TextSize": 11.160003662109375,
//             "attributes": {
//                 "LineHeight": 13.375
//             }
//         },
//         {
//             "Bounds": [
//                 77.447998046875,
//                 430.0731964111328,
//                 530.1510314941406,
//                 439.5282440185547
//             ],
//             "ClipBounds": [
//                 77.447998046875,
//                 430.0731964111328,
//                 530.1510314941406,
//                 439.5282440185547
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[2]",
//             "attributes": {
//                 "BBox": [
//                     71.5170999999973,
//                     414.73499999998603,
//                     540.9379999999946,
//                     447.73399999999674
//                 ],
//                 "NumCol": 4,
//                 "Placement": "Block",
//                 "SpaceAfter": 18
//             }
//         },
//         {
//             "Bounds": [
//                 77.447998046875,
//                 430.0731964111328,
//                 104.47239685058594,
//                 439.5282440185547
//             ],
//             "ClipBounds": [
//                 77.447998046875,
//                 430.0731964111328,
//                 104.47239685058594,
//                 439.5282440185547
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[2]/TR/TD",
//             "attributes": {
//                 "BBox": [
//                     71.5170999999973,
//                     413.8949999999895,
//                     358.78499999998894,
//                     447.73399999999674
//                 ],
//                 "BlockAlign": "Middle",
//                 "BorderColor": [
//                     [
//                         0,
//                         0,
//                         0
//                     ],
//                     [
//                         0.6235349999999755,
//                         0.6235349999999755,
//                         0.6235349999999755
//                     ],
//                     [
//                         0,
//                         0,
//                         0
//                     ],
//                     [
//                         0,
//                         0,
//                         0
//                     ]
//                 ],
//                 "BorderStyle": "Solid",
//                 "BorderThickness": [
//                     0.625,
//                     0.875,
//                     0.5,
//                     0.25
//                 ],
//                 "ColIndex": 0,
//                 "Height": 33.875,
//                 "InlineAlign": "Start",
//                 "RowIndex": 0,
//                 "Width": 287.25
//             }
//         },
//         {
//             "Bounds": [
//                 77.447998046875,
//                 430.0731964111328,
//                 104.47239685058594,
//                 439.5282440185547
//             ],
//             "ClipBounds": [
//                 77.447998046875,
//                 430.0731964111328,
//                 104.47239685058594,
//                 439.5282440185547
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "XHPPCY+Arial-BoldMT",
//                 "subset": true,
//                 "weight": 700
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table[2]/TR/TD/P",
//             "Text": "ITEM ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 363.1000061035156,
//                 430.0731964111328,
//                 386.6570281982422,
//                 439.5282440185547
//             ],
//             "ClipBounds": [
//                 363.1000061035156,
//                 430.0731964111328,
//                 386.6570281982422,
//                 439.5282440185547
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[2]/TR/TD[2]",
//             "attributes": {
//                 "BBox": [
//                     358.304999999993,
//                     413.8949999999895,
//                     415.6629999999859,
//                     447.73399999999674
//                 ],
//                 "BlockAlign": "Middle",
//                 "BorderColor": [
//                     [
//                         0,
//                         0,
//                         0
//                     ],
//                     [
//                         0.6235349999999755,
//                         0.6235349999999755,
//                         0.6235349999999755
//                     ],
//                     [
//                         0,
//                         0,
//                         0
//                     ],
//                     [
//                         0,
//                         0,
//                         0
//                     ]
//                 ],
//                 "BorderStyle": "Solid",
//                 "BorderThickness": [
//                     0.625,
//                     0.875,
//                     0.25,
//                     0.25
//                 ],
//                 "ColIndex": 1,
//                 "Height": 33.875,
//                 "InlineAlign": "Start",
//                 "RowIndex": 0,
//                 "Width": 57.375
//             }
//         },
//         {
//             "Bounds": [
//                 363.1000061035156,
//                 430.0731964111328,
//                 386.6570281982422,
//                 439.5282440185547
//             ],
//             "ClipBounds": [
//                 363.1000061035156,
//                 430.0731964111328,
//                 386.6570281982422,
//                 439.5282440185547
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "XHPPCY+Arial-BoldMT",
//                 "subset": true,
//                 "weight": 700
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table[2]/TR/TD[2]/P",
//             "Text": "QTY ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 420.3800048828125,
//                 430.0731964111328,
//                 450.7712707519531,
//                 439.5282440185547
//             ],
//             "ClipBounds": [
//                 420.3800048828125,
//                 430.0731964111328,
//                 450.7712707519531,
//                 439.5282440185547
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[2]/TR/TD[3]",
//             "attributes": {
//                 "BBox": [
//                     415.18299999999,
//                     413.8949999999895,
//                     481.8999999999942,
//                     447.73399999999674
//                 ],
//                 "BlockAlign": "Middle",
//                 "BorderColor": [
//                     [
//                         0,
//                         0,
//                         0
//                     ],
//                     [
//                         0.6235349999999755,
//                         0.6235349999999755,
//                         0.6235349999999755
//                     ],
//                     [
//                         0,
//                         0,
//                         0
//                     ],
//                     [
//                         0,
//                         0,
//                         0
//                     ]
//                 ],
//                 "BorderStyle": "Solid",
//                 "BorderThickness": [
//                     0.625,
//                     0.875,
//                     0.25,
//                     0.25
//                 ],
//                 "ColIndex": 2,
//                 "Height": 33.875,
//                 "InlineAlign": "Start",
//                 "RowIndex": 0,
//                 "Width": 66.75
//             }
//         },
//         {
//             "Bounds": [
//                 420.3800048828125,
//                 430.0731964111328,
//                 450.7712707519531,
//                 439.5282440185547
//             ],
//             "ClipBounds": [
//                 420.3800048828125,
//                 430.0731964111328,
//                 450.7712707519531,
//                 439.5282440185547
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "XHPPCY+Arial-BoldMT",
//                 "subset": true,
//                 "weight": 700
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table[2]/TR/TD[3]/P",
//             "Text": "RATE ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 483.4100036621094,
//                 430.0731964111328,
//                 530.1510314941406,
//                 439.5282440185547
//             ],
//             "ClipBounds": [
//                 483.4100036621094,
//                 430.0731964111328,
//                 530.1510314941406,
//                 439.5282440185547
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[2]/TR/TD[4]",
//             "attributes": {
//                 "BBox": [
//                     481.41999999999825,
//                     413.8949999999895,
//                     541.417999999976,
//                     447.73399999999674
//                 ],
//                 "BlockAlign": "Middle",
//                 "BorderColor": [
//                     [
//                         0,
//                         0,
//                         0
//                     ],
//                     [
//                         0.6235349999999755,
//                         0.6235349999999755,
//                         0.6235349999999755
//                     ],
//                     [
//                         0,
//                         0,
//                         0
//                     ],
//                     [
//                         0,
//                         0,
//                         0
//                     ]
//                 ],
//                 "BorderStyle": "Solid",
//                 "BorderThickness": [
//                     0.625,
//                     0.875,
//                     0.25,
//                     0.5
//                 ],
//                 "ColIndex": 3,
//                 "Height": 33.875,
//                 "InlineAlign": "Start",
//                 "RowIndex": 0,
//                 "Width": 60
//             }
//         },
//         {
//             "Bounds": [
//                 483.4100036621094,
//                 430.0731964111328,
//                 530.1510314941406,
//                 439.5282440185547
//             ],
//             "ClipBounds": [
//                 483.4100036621094,
//                 430.0731964111328,
//                 530.1510314941406,
//                 439.5282440185547
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "XHPPCY+Arial-BoldMT",
//                 "subset": true,
//                 "weight": 700
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table[2]/TR/TD[4]/P",
//             "Text": "AMOUNT ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 77.447998046875,
//                 293.5632019042969,
//                 517.7280731201172,
//                 403.50823974609375
//             ],
//             "ClipBounds": [
//                 77.447998046875,
//                 293.5632019042969,
//                 517.7280731201172,
//                 403.50823974609375
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]",
//             "attributes": {
//                 "BBox": [
//                     71.5170999999973,
//                     276.38099999999395,
//                     540.9379999999946,
//                     411.97499999999127
//                 ],
//                 "NumCol": 4,
//                 "NumRow": 4,
//                 "Placement": "Block",
//                 "SpaceAfter": 18
//             }
//         },
//         {
//             "Bounds": [
//                 77.447998046875,
//                 394.05320739746094,
//                 169.42799377441406,
//                 403.50823974609375
//             ],
//             "ClipBounds": [
//                 77.447998046875,
//                 394.05320739746094,
//                 169.42799377441406,
//                 403.50823974609375
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR/TD",
//             "attributes": {
//                 "BBox": [
//                     71.5170999999973,
//                     376.33699999999953,
//                     358.0649999999878,
//                     411.97499999999127
//                 ],
//                 "BlockAlign": "Before",
//                 "BorderColor": [
//                     0,
//                     0,
//                     0
//                 ],
//                 "BorderStyle": "Solid",
//                 "BorderThickness": [
//                     0.625,
//                     0.25,
//                     0.5,
//                     0.25
//                 ],
//                 "ColIndex": 0,
//                 "Height": 35.625,
//                 "InlineAlign": "Start",
//                 "RowIndex": 0,
//                 "Width": 286.375
//             }
//         },
//         {
//             "Bounds": [
//                 77.447998046875,
//                 394.05320739746094,
//                 169.42799377441406,
//                 403.50823974609375
//             ],
//             "ClipBounds": [
//                 77.447998046875,
//                 394.05320739746094,
//                 169.42799377441406,
//                 403.50823974609375
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR/TD/P",
//             "Text": "Generic Steel Chips ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 363.82000732421875,
//                 394.05320739746094,
//                 378.3000030517578,
//                 403.50823974609375
//             ],
//             "ClipBounds": [
//                 363.82000732421875,
//                 394.05320739746094,
//                 378.3000030517578,
//                 403.50823974609375
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR/TD[2]",
//             "attributes": {
//                 "BBox": [
//                     357.58499999999185,
//                     376.33699999999953,
//                     414.22299999999814,
//                     411.97499999999127
//                 ],
//                 "BlockAlign": "Before",
//                 "BorderColor": [
//                     0,
//                     0,
//                     0
//                 ],
//                 "BorderStyle": "Solid",
//                 "BorderThickness": [
//                     0.625,
//                     0.25,
//                     0.25,
//                     0.25
//                 ],
//                 "ColIndex": 1,
//                 "Height": 35.625,
//                 "InlineAlign": "Start",
//                 "RowIndex": 0,
//                 "Width": 56.625
//             }
//         },
//         {
//             "Bounds": [
//                 363.82000732421875,
//                 394.05320739746094,
//                 378.3000030517578,
//                 403.50823974609375
//             ],
//             "ClipBounds": [
//                 363.82000732421875,
//                 394.05320739746094,
//                 378.3000030517578,
//                 403.50823974609375
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR/TD[2]/P",
//             "Text": "70 ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 420.3800048828125,
//                 394.05320739746094,
//                 434.86000061035156,
//                 403.50823974609375
//             ],
//             "ClipBounds": [
//                 420.3800048828125,
//                 394.05320739746094,
//                 434.86000061035156,
//                 403.50823974609375
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR/TD[3]",
//             "attributes": {
//                 "BBox": [
//                     413.74299999998766,
//                     376.33699999999953,
//                     481.8999999999942,
//                     411.97499999999127
//                 ],
//                 "BlockAlign": "Before",
//                 "BorderColor": [
//                     0,
//                     0,
//                     0
//                 ],
//                 "BorderStyle": "Solid",
//                 "BorderThickness": [
//                     0.625,
//                     0.25,
//                     0.25,
//                     0.25
//                 ],
//                 "ColIndex": 2,
//                 "Height": 35.625,
//                 "InlineAlign": "Start",
//                 "RowIndex": 0,
//                 "Width": 68.125
//             }
//         },
//         {
//             "Bounds": [
//                 420.3800048828125,
//                 394.05320739746094,
//                 434.86000061035156,
//                 403.50823974609375
//             ],
//             "ClipBounds": [
//                 420.3800048828125,
//                 394.05320739746094,
//                 434.86000061035156,
//                 403.50823974609375
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR/TD[3]/P",
//             "Text": "68 ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 487.00999450683594,
//                 394.05320739746094,
//                 517.7280731201172,
//                 403.50823974609375
//             ],
//             "ClipBounds": [
//                 487.00999450683594,
//                 394.05320739746094,
//                 517.7280731201172,
//                 403.50823974609375
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR/TD[4]",
//             "attributes": {
//                 "BBox": [
//                     481.41999999999825,
//                     376.33699999999953,
//                     541.417999999976,
//                     411.97499999999127
//                 ],
//                 "BlockAlign": "Before",
//                 "BorderColor": [
//                     0,
//                     0,
//                     0
//                 ],
//                 "BorderStyle": "Solid",
//                 "BorderThickness": [
//                     0.625,
//                     0.25,
//                     0.25,
//                     0.5
//                 ],
//                 "ColIndex": 3,
//                 "Height": 35.625,
//                 "InlineAlign": "Start",
//                 "RowIndex": 0,
//                 "Width": 60
//             }
//         },
//         {
//             "Bounds": [
//                 487.00999450683594,
//                 394.05320739746094,
//                 517.7280731201172,
//                 403.50823974609375
//             ],
//             "ClipBounds": [
//                 487.00999450683594,
//                 394.05320739746094,
//                 517.7280731201172,
//                 403.50823974609375
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR/TD[4]/P",
//             "Text": "$4760 ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 77.447998046875,
//                 360.5731964111328,
//                 199.81919860839844,
//                 370.0282440185547
//             ],
//             "ClipBounds": [
//                 77.447998046875,
//                 360.5731964111328,
//                 199.81919860839844,
//                 370.0282440185547
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR[2]/TD",
//             "attributes": {
//                 "BBox": [
//                     71.5170999999973,
//                     343.2179999999935,
//                     358.0649999999878,
//                     376.81699999999546
//                 ],
//                 "BlockAlign": "Before",
//                 "BorderColor": [
//                     0,
//                     0,
//                     0
//                 ],
//                 "BorderStyle": "Solid",
//                 "BorderThickness": [
//                     0.25,
//                     0.25,
//                     0.5,
//                     0.25
//                 ],
//                 "ColIndex": 0,
//                 "Height": 33.625,
//                 "InlineAlign": "Start",
//                 "RowIndex": 1,
//                 "Width": 286.375
//             }
//         },
//         {
//             "Bounds": [
//                 77.447998046875,
//                 360.5731964111328,
//                 199.81919860839844,
//                 370.0282440185547
//             ],
//             "ClipBounds": [
//                 77.447998046875,
//                 360.5731964111328,
//                 199.81919860839844,
//                 370.0282440185547
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR[2]/TD/P",
//             "Text": "Practical Granite Keyboard ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 363.82000732421875,
//                 360.5731964111328,
//                 378.3000030517578,
//                 370.0282440185547
//             ],
//             "ClipBounds": [
//                 363.82000732421875,
//                 360.5731964111328,
//                 378.3000030517578,
//                 370.0282440185547
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR[2]/TD[2]",
//             "attributes": {
//                 "BBox": [
//                     357.58499999999185,
//                     343.2179999999935,
//                     414.22299999999814,
//                     376.81699999999546
//                 ],
//                 "BlockAlign": "Before",
//                 "BorderColor": [
//                     0,
//                     0,
//                     0
//                 ],
//                 "BorderStyle": "Solid",
//                 "BorderThickness": 0.25,
//                 "ColIndex": 1,
//                 "Height": 33.625,
//                 "InlineAlign": "Start",
//                 "RowIndex": 1,
//                 "Width": 56.625
//             }
//         },
//         {
//             "Bounds": [
//                 363.82000732421875,
//                 360.5731964111328,
//                 378.3000030517578,
//                 370.0282440185547
//             ],
//             "ClipBounds": [
//                 363.82000732421875,
//                 360.5731964111328,
//                 378.3000030517578,
//                 370.0282440185547
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR[2]/TD[2]/P",
//             "Text": "22 ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 420.3800048828125,
//                 360.5731964111328,
//                 434.86000061035156,
//                 370.0282440185547
//             ],
//             "ClipBounds": [
//                 420.3800048828125,
//                 360.5731964111328,
//                 434.86000061035156,
//                 370.0282440185547
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR[2]/TD[3]",
//             "attributes": {
//                 "BBox": [
//                     413.74299999998766,
//                     343.2179999999935,
//                     481.8999999999942,
//                     376.81699999999546
//                 ],
//                 "BlockAlign": "Before",
//                 "BorderColor": [
//                     0,
//                     0,
//                     0
//                 ],
//                 "BorderStyle": "Solid",
//                 "BorderThickness": 0.25,
//                 "ColIndex": 2,
//                 "Height": 33.625,
//                 "InlineAlign": "Start",
//                 "RowIndex": 1,
//                 "Width": 68.125
//             }
//         },
//         {
//             "Bounds": [
//                 420.3800048828125,
//                 360.5731964111328,
//                 434.86000061035156,
//                 370.0282440185547
//             ],
//             "ClipBounds": [
//                 420.3800048828125,
//                 360.5731964111328,
//                 434.86000061035156,
//                 370.0282440185547
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR[2]/TD[3]/P",
//             "Text": "48 ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 487.00999450683594,
//                 360.5731964111328,
//                 517.7280731201172,
//                 370.0282440185547
//             ],
//             "ClipBounds": [
//                 487.00999450683594,
//                 360.5731964111328,
//                 517.7280731201172,
//                 370.0282440185547
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR[2]/TD[4]",
//             "attributes": {
//                 "BBox": [
//                     481.41999999999825,
//                     343.2179999999935,
//                     541.417999999976,
//                     376.81699999999546
//                 ],
//                 "BlockAlign": "Before",
//                 "BorderColor": [
//                     0,
//                     0,
//                     0
//                 ],
//                 "BorderStyle": "Solid",
//                 "BorderThickness": [
//                     0.25,
//                     0.25,
//                     0.25,
//                     0.5
//                 ],
//                 "ColIndex": 3,
//                 "Height": 33.625,
//                 "InlineAlign": "Start",
//                 "RowIndex": 1,
//                 "Width": 60
//             }
//         },
//         {
//             "Bounds": [
//                 487.00999450683594,
//                 360.5731964111328,
//                 517.7280731201172,
//                 370.0282440185547
//             ],
//             "ClipBounds": [
//                 487.00999450683594,
//                 360.5731964111328,
//                 517.7280731201172,
//                 370.0282440185547
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR[2]/TD[4]/P",
//             "Text": "$1056 ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 77.447998046875,
//                 327.0632019042969,
//                 176.2823944091797,
//                 336.5182342529297
//             ],
//             "ClipBounds": [
//                 77.447998046875,
//                 327.0632019042969,
//                 176.2823944091797,
//                 336.5182342529297
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR[3]/TD",
//             "attributes": {
//                 "BBox": [
//                     71.5170999999973,
//                     310.81999999999243,
//                     358.0649999999878,
//                     343.6979999999894
//                 ],
//                 "BlockAlign": "Before",
//                 "BorderColor": [
//                     0,
//                     0,
//                     0
//                 ],
//                 "BorderStyle": "Solid",
//                 "BorderThickness": [
//                     0.25,
//                     0.25,
//                     0.5,
//                     0.25
//                 ],
//                 "ColIndex": 0,
//                 "Height": 32.875,
//                 "InlineAlign": "Start",
//                 "RowIndex": 2,
//                 "Width": 286.375
//             }
//         },
//         {
//             "Bounds": [
//                 77.447998046875,
//                 327.0632019042969,
//                 176.2823944091797,
//                 336.5182342529297
//             ],
//             "ClipBounds": [
//                 77.447998046875,
//                 327.0632019042969,
//                 176.2823944091797,
//                 336.5182342529297
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR[3]/TD/P",
//             "Text": "Tasty Wooden Shoes ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 363.82000732421875,
//                 327.0632019042969,
//                 383.3751983642578,
//                 336.5182342529297
//             ],
//             "ClipBounds": [
//                 363.82000732421875,
//                 327.0632019042969,
//                 383.3751983642578,
//                 336.5182342529297
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR[3]/TD[2]",
//             "attributes": {
//                 "BBox": [
//                     357.58499999999185,
//                     310.81999999999243,
//                     414.22299999999814,
//                     343.6979999999894
//                 ],
//                 "BlockAlign": "Before",
//                 "BorderColor": [
//                     0,
//                     0,
//                     0
//                 ],
//                 "BorderStyle": "Solid",
//                 "BorderThickness": 0.25,
//                 "ColIndex": 1,
//                 "Height": 32.875,
//                 "InlineAlign": "Start",
//                 "RowIndex": 2,
//                 "Width": 56.625
//             }
//         },
//         {
//             "Bounds": [
//                 363.82000732421875,
//                 327.0632019042969,
//                 383.3751983642578,
//                 336.5182342529297
//             ],
//             "ClipBounds": [
//                 363.82000732421875,
//                 327.0632019042969,
//                 383.3751983642578,
//                 336.5182342529297
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR[3]/TD[2]/P",
//             "Text": "120 ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 420.3800048828125,
//                 327.0632019042969,
//                 434.86000061035156,
//                 336.5182342529297
//             ],
//             "ClipBounds": [
//                 420.3800048828125,
//                 327.0632019042969,
//                 434.86000061035156,
//                 336.5182342529297
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR[3]/TD[3]",
//             "attributes": {
//                 "BBox": [
//                     413.74299999998766,
//                     310.81999999999243,
//                     481.8999999999942,
//                     343.6979999999894
//                 ],
//                 "BlockAlign": "Before",
//                 "BorderColor": [
//                     0,
//                     0,
//                     0
//                 ],
//                 "BorderStyle": "Solid",
//                 "BorderThickness": 0.25,
//                 "ColIndex": 2,
//                 "Height": 32.875,
//                 "InlineAlign": "Start",
//                 "RowIndex": 2,
//                 "Width": 68.125
//             }
//         },
//         {
//             "Bounds": [
//                 420.3800048828125,
//                 327.0632019042969,
//                 434.86000061035156,
//                 336.5182342529297
//             ],
//             "ClipBounds": [
//                 420.3800048828125,
//                 327.0632019042969,
//                 434.86000061035156,
//                 336.5182342529297
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR[3]/TD[3]/P",
//             "Text": "75 ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 487.00999450683594,
//                 327.0632019042969,
//                 517.7280731201172,
//                 336.5182342529297
//             ],
//             "ClipBounds": [
//                 487.00999450683594,
//                 327.0632019042969,
//                 517.7280731201172,
//                 336.5182342529297
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR[3]/TD[4]",
//             "attributes": {
//                 "BBox": [
//                     481.41999999999825,
//                     310.81999999999243,
//                     541.417999999976,
//                     343.6979999999894
//                 ],
//                 "BlockAlign": "Before",
//                 "BorderColor": [
//                     0,
//                     0,
//                     0
//                 ],
//                 "BorderStyle": "Solid",
//                 "BorderThickness": [
//                     0.25,
//                     0.25,
//                     0.25,
//                     0.5
//                 ],
//                 "ColIndex": 3,
//                 "Height": 32.875,
//                 "InlineAlign": "Start",
//                 "RowIndex": 2,
//                 "Width": 60
//             }
//         },
//         {
//             "Bounds": [
//                 487.00999450683594,
//                 327.0632019042969,
//                 517.7280731201172,
//                 336.5182342529297
//             ],
//             "ClipBounds": [
//                 487.00999450683594,
//                 327.0632019042969,
//                 517.7280731201172,
//                 336.5182342529297
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR[3]/TD[4]/P",
//             "Text": "$9000 ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 77.447998046875,
//                 293.5632019042969,
//                 175.46591186523438,
//                 303.0182342529297
//             ],
//             "ClipBounds": [
//                 77.447998046875,
//                 293.5632019042969,
//                 175.46591186523438,
//                 303.0182342529297
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR[4]/TD",
//             "attributes": {
//                 "BBox": [
//                     71.5170999999973,
//                     275.7809999999881,
//                     358.0649999999878,
//                     311.29999999998836
//                 ],
//                 "BlockAlign": "Middle",
//                 "BorderColor": [
//                     0,
//                     0,
//                     0
//                 ],
//                 "BorderStyle": "Solid",
//                 "BorderThickness": [
//                     0.25,
//                     0.625,
//                     0.5,
//                     0.25
//                 ],
//                 "ColIndex": 0,
//                 "Height": 35.5,
//                 "InlineAlign": "Start",
//                 "RowIndex": 3,
//                 "Width": 286.375
//             }
//         },
//         {
//             "Bounds": [
//                 77.447998046875,
//                 293.5632019042969,
//                 175.46591186523438,
//                 303.0182342529297
//             ],
//             "ClipBounds": [
//                 77.447998046875,
//                 293.5632019042969,
//                 175.46591186523438,
//                 303.0182342529297
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR[4]/TD/P",
//             "Text": "Unbranded Metal Hat ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 363.82000732421875,
//                 293.5632019042969,
//                 383.3751983642578,
//                 303.0182342529297
//             ],
//             "ClipBounds": [
//                 363.82000732421875,
//                 293.5632019042969,
//                 383.3751983642578,
//                 303.0182342529297
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR[4]/TD[2]",
//             "attributes": {
//                 "BBox": [
//                     357.58499999999185,
//                     275.7809999999881,
//                     414.22299999999814,
//                     311.29999999998836
//                 ],
//                 "BlockAlign": "Middle",
//                 "BorderColor": [
//                     0,
//                     0,
//                     0
//                 ],
//                 "BorderStyle": "Solid",
//                 "BorderThickness": [
//                     0.25,
//                     0.625,
//                     0.25,
//                     0.25
//                 ],
//                 "ColIndex": 1,
//                 "Height": 35.5,
//                 "InlineAlign": "Start",
//                 "RowIndex": 3,
//                 "Width": 56.625
//             }
//         },
//         {
//             "Bounds": [
//                 363.82000732421875,
//                 293.5632019042969,
//                 383.3751983642578,
//                 303.0182342529297
//             ],
//             "ClipBounds": [
//                 363.82000732421875,
//                 293.5632019042969,
//                 383.3751983642578,
//                 303.0182342529297
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR[4]/TD[2]/P",
//             "Text": "118 ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 420.3800048828125,
//                 293.5632019042969,
//                 434.86000061035156,
//                 303.0182342529297
//             ],
//             "ClipBounds": [
//                 420.3800048828125,
//                 293.5632019042969,
//                 434.86000061035156,
//                 303.0182342529297
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR[4]/TD[3]",
//             "attributes": {
//                 "BBox": [
//                     413.74299999998766,
//                     275.7809999999881,
//                     481.8999999999942,
//                     311.29999999998836
//                 ],
//                 "BlockAlign": "Middle",
//                 "BorderColor": [
//                     0,
//                     0,
//                     0
//                 ],
//                 "BorderStyle": "Solid",
//                 "BorderThickness": [
//                     0.25,
//                     0.625,
//                     0.25,
//                     0.25
//                 ],
//                 "ColIndex": 2,
//                 "Height": 35.5,
//                 "InlineAlign": "Start",
//                 "RowIndex": 3,
//                 "Width": 68.125
//             }
//         },
//         {
//             "Bounds": [
//                 420.3800048828125,
//                 293.5632019042969,
//                 434.86000061035156,
//                 303.0182342529297
//             ],
//             "ClipBounds": [
//                 420.3800048828125,
//                 293.5632019042969,
//                 434.86000061035156,
//                 303.0182342529297
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR[4]/TD[3]/P",
//             "Text": "61 ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 487.00999450683594,
//                 293.5632019042969,
//                 517.7280731201172,
//                 303.0182342529297
//             ],
//             "ClipBounds": [
//                 487.00999450683594,
//                 293.5632019042969,
//                 517.7280731201172,
//                 303.0182342529297
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR[4]/TD[4]",
//             "attributes": {
//                 "BBox": [
//                     481.41999999999825,
//                     275.7809999999881,
//                     541.417999999976,
//                     311.29999999998836
//                 ],
//                 "BlockAlign": "Middle",
//                 "BorderColor": [
//                     0,
//                     0,
//                     0
//                 ],
//                 "BorderStyle": "Solid",
//                 "BorderThickness": [
//                     0.25,
//                     0.625,
//                     0.25,
//                     0.5
//                 ],
//                 "ColIndex": 3,
//                 "Height": 35.5,
//                 "InlineAlign": "Start",
//                 "RowIndex": 3,
//                 "Width": 60
//             }
//         },
//         {
//             "Bounds": [
//                 487.00999450683594,
//                 293.5632019042969,
//                 517.7280731201172,
//                 303.0182342529297
//             ],
//             "ClipBounds": [
//                 487.00999450683594,
//                 293.5632019042969,
//                 517.7280731201172,
//                 303.0182342529297
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table[3]/TR[4]/TD[4]/P",
//             "Text": "$7198 ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 77.447998046875,
//                 180.1132049560547,
//                 522.3792724609375,
//                 223.0782470703125
//             ],
//             "ClipBounds": [
//                 77.447998046875,
//                 180.1132049560547,
//                 522.3792724609375,
//                 223.0782470703125
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[4]",
//             "attributes": {
//                 "BBox": [
//                     77.03689999999915,
//                     182.18499999999767,
//                     519.8189999999886,
//                     221.42299999999523
//                 ],
//                 "NumCol": 2,
//                 "NumRow": 2,
//                 "Placement": "Block",
//                 "SpaceAfter": 18
//             }
//         },
//         {
//             "Bounds": [
//                 77.447998046875,
//                 213.62319946289062,
//                 120.4593505859375,
//                 223.0782470703125
//             ],
//             "ClipBounds": [
//                 77.447998046875,
//                 213.62319946289062,
//                 120.4593505859375,
//                 223.0782470703125
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[4]/TR/TD",
//             "attributes": {
//                 "BBox": [
//                     77.03689999999915,
//                     196.58399999999529,
//                     358.54499999999825,
//                     221.42299999999523
//                 ],
//                 "BlockAlign": "Before",
//                 "ColIndex": 0,
//                 "Height": 24.875,
//                 "InlineAlign": "Start",
//                 "RowIndex": 0,
//                 "Width": 281.5
//             }
//         },
//         {
//             "Bounds": [
//                 77.447998046875,
//                 213.62319946289062,
//                 120.4593505859375,
//                 223.0782470703125
//             ],
//             "ClipBounds": [
//                 77.447998046875,
//                 213.62319946289062,
//                 120.4593505859375,
//                 223.0782470703125
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "XHPPCY+Arial-BoldMT",
//                 "subset": true,
//                 "weight": 700
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table[4]/TR/TD/P",
//             "Text": "Subtotal ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 485.92999267578125,
//                 213.62319946289062,
//                 522.3792724609375,
//                 223.0782470703125
//             ],
//             "ClipBounds": [
//                 485.92999267578125,
//                 213.62319946289062,
//                 522.3792724609375,
//                 223.0782470703125
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[4]/TR/TD[2]",
//             "attributes": {
//                 "BBox": [
//                     358.54499999999825,
//                     196.58399999999529,
//                     519.8189999999886,
//                     221.42299999999523
//                 ],
//                 "BlockAlign": "Before",
//                 "ColIndex": 1,
//                 "Height": 24.875,
//                 "InlineAlign": "End",
//                 "RowIndex": 0,
//                 "Width": 161.25
//             }
//         },
//         {
//             "Bounds": [
//                 485.92999267578125,
//                 213.62319946289062,
//                 522.3792724609375,
//                 223.0782470703125
//             ],
//             "ClipBounds": [
//                 485.92999267578125,
//                 213.62319946289062,
//                 522.3792724609375,
//                 223.0782470703125
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table[4]/TR/TD[2]/P",
//             "Text": "$22014 ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 77.447998046875,
//                 180.1132049560547,
//                 109.73143005371094,
//                 189.5682373046875
//             ],
//             "ClipBounds": [
//                 77.447998046875,
//                 180.1132049560547,
//                 109.73143005371094,
//                 189.5682373046875
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[4]/TR[2]/TD",
//             "attributes": {
//                 "BBox": [
//                     77.03689999999915,
//                     182.18499999999767,
//                     358.54499999999825,
//                     196.58399999999529
//                 ],
//                 "BlockAlign": "After",
//                 "ColIndex": 0,
//                 "Height": 14.375,
//                 "InlineAlign": "Start",
//                 "RowIndex": 1,
//                 "Width": 281.5
//             }
//         },
//         {
//             "Bounds": [
//                 77.447998046875,
//                 180.1132049560547,
//                 109.73143005371094,
//                 189.5682373046875
//             ],
//             "ClipBounds": [
//                 77.447998046875,
//                 180.1132049560547,
//                 109.73143005371094,
//                 189.5682373046875
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "XHPPCY+Arial-BoldMT",
//                 "subset": true,
//                 "weight": 700
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table[4]/TR[2]/TD/P",
//             "Text": "Tax % ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 485.92999267578125,
//                 180.1132049560547,
//                 500.4100036621094,
//                 189.5682373046875
//             ],
//             "ClipBounds": [
//                 485.92999267578125,
//                 180.1132049560547,
//                 500.4100036621094,
//                 189.5682373046875
//             ],
//             "Page": 0,
//             "Path": "//Document/Sect/Table[4]/TR[2]/TD[2]",
//             "attributes": {
//                 "BBox": [
//                     358.54499999999825,
//                     182.18499999999767,
//                     519.8189999999886,
//                     196.58399999999529
//                 ],
//                 "BlockAlign": "After",
//                 "ColIndex": 1,
//                 "Height": 14.375,
//                 "InlineAlign": "End",
//                 "RowIndex": 1,
//                 "Width": 161.25
//             }
//         },
//         {
//             "Bounds": [
//                 485.92999267578125,
//                 180.1132049560547,
//                 500.4100036621094,
//                 189.5682373046875
//             ],
//             "ClipBounds": [
//                 485.92999267578125,
//                 180.1132049560547,
//                 500.4100036621094,
//                 189.5682373046875
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/Table[4]/TR[2]/TD[2]/P",
//             "Text": "10 ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "LineHeight": 12.125
//             }
//         },
//         {
//             "Bounds": [
//                 77.447998046875,
//                 82.5072021484375,
//                 126.14447021484375,
//                 91.96223449707031
//             ],
//             "ClipBounds": [
//                 77.447998046875,
//                 82.5072021484375,
//                 126.14447021484375,
//                 91.96223449707031
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "XHPPCY+Arial-BoldMT",
//                 "subset": true,
//                 "weight": 700
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/P[6]",
//             "Text": "Total Due ",
//             "TextSize": 10.080001831054688,
//             "attributes": {
//                 "SpaceAfter": 8.5
//             }
//         },
//         {
//             "Bounds": [
//                 485.92999267578125,
//                 80.57400512695312,
//                 526.1329956054688,
//                 89.01600646972656
//             ],
//             "ClipBounds": [
//                 485.92999267578125,
//                 80.57400512695312,
//                 526.1329956054688,
//                 89.01600646972656
//             ],
//             "Font": {
//                 "alt_family_name": "Arial",
//                 "embedded": true,
//                 "encoding": "WinAnsiEncoding",
//                 "family_name": "Arial MT",
//                 "font_type": "TrueType",
//                 "italic": false,
//                 "monospaced": false,
//                 "name": "GFYRYG+ArialMT",
//                 "subset": true,
//                 "weight": 400
//             },
//             "HasClip": true,
//             "Lang": "en",
//             "Page": 0,
//             "Path": "//Document/Sect/P[7]",
//             "Text": "$24215.4 ",
//             "TextSize": 9,
//             "attributes": {
//                 "LineHeight": 10.75
//             }
//         }
//     ],
//     "pages": [
//         {
//             "boxes": {
//                 "CropBox": [
//                     0,
//                     0,
//                     612,
//                     792
//                 ],
//                 "MediaBox": [
//                     0,
//                     0,
//                     612,
//                     792
//                 ]
//             },
//             "height": 792,
//             "is_scanned": false,
//             "page_number": 0,
//             "rotation": 0,
//             "width": 612
//         }
//     ]
// };

// let parser=new Parser();
// parser.parseApiResponse(jsonData);
// console.log(parser.collectiveParsedReponse);