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




function parseApiResponse(json) {

  let businessAddress = "";
  let businessName = "";
  let businessDescription = "";
  let customerDetails = [];
  let invoiceDescription = "";
  let invoiceDueDate;
  let invoiceIssueDetails = [];
  let invoiceTax;
  let invoiceBillDetails=[];

  for(let i=0;i<json.elements.length;i++){
    let element=json.elements[i];
    let path = element.Path;

    if (path === "//Document/Sect/Title") {
      businessName = element.Text.trim();
    } else if (path.startsWith("//Document/Sect/P[2]/")) {
      businessAddress += element.Text;
    } else if (path === "//Document/Sect/P[4]") {
      businessDescription = element.Text.trim();
    } else if (path.startsWith("//Document/Sect/P[6]/Sub")) {
      customerDetails.push(element.Text);
    } else if (
      path.startsWith("//Document/Sect/Table/TR") &&
      path.endsWith("/TD/P")
    ) {
      invoiceDescription += element.Text.trim();
    } else if (path === "//Document/Sect/P[9]") {
      let dueDateArray = element.Text.split(":");
      let dueDate = dueDateArray.pop();
      dueDate.trim();
      invoiceDueDate = new Date(dueDate);
    } else if (path.startsWith("//Document/Sect/P[3]/Sub")) {
      invoiceIssueDetails.push(element.Text);
    } else if (path === "//Document/Sect/Table[4]/TR[2]/TD[2]/P") {
      invoiceTax = Number(element.Text.trim());
    } else if(path.startsWith("//Document/Sect/Table[3]/TR") && path.endsWith("/P")){
        let currentItemDetails={
            "Invoice__BillDetails__Name": element.Text.trim(),
            "Invoice__BillDetails__Quantity": Number(json.elements[i+2].Text),
            "Invoice__BillDetails__Rate": Number(json.elements[i+4].Text)
        }
        invoiceBillDetails.push(currentItemDetails);
        i+=7;
    }
  }

  let parsedBusinessAddress=parseBusinessAddress(businessAddress);
  let parsedInvoiceDetails=parseInvoiceDetails(invoiceIssueDetails);
  let parsedCustomerDetails=parseCustomerDetails(customerDetails);

  console.log(invoiceBillDetails);

  let responseJson = {
    bussiness_city: parsedBusinessAddress.city,
    bussiness_country: parsedBusinessAddress.country,
    businessDescription: businessDescription,
    businessName: businessName,
    business_street: parsedBusinessAddress.street,
    business_zipcode: parsedBusinessAddress.zipcode,
    customerAddressLine1: parsedCustomerDetails.addressLine1,
    customerAddressLine2: parsedCustomerDetails.addressLine2,
    customerEmail: parsedCustomerDetails.email,
    customerName: parsedCustomerDetails.name,
    customerPhoneNo: parsedCustomerDetails.phoneNo,
    invoiceDescription: invoiceDescription,
    invoiceDueDate: invoiceDueDate,
    invoiceIssueDate: parsedInvoiceDetails.issuedDate,
    invoiceNumber: parsedInvoiceDetails.invoiceNumber,
    invoiceTax: invoiceTax,
  };
  return responseJson;
}


const jsonData = {
  version: {
    json_export: "187",
    page_segmentation: "5",
    schema: "1.1.0",
    structure: "1.1036.0",
    table_structure: "5",
  },
  extended_metadata: {
    ID_instance: "CA 6C 0F 5B 37 B7 B2 11 0A 00 67 45 8B 6B C6 23 ",
    ID_permanent:
      "34 34 20 42 33 20 30 43 20 35 42 20 33 37 20 42 37 20 42 32 20 31 31 20 30 41 20 30 30 20 36 37 20 34 35 20 38 42 20 36 42 20 43 36 20 32 33 20 ",
    pdf_version: "1.6",
    pdfa_compliance_level: "",
    is_encrypted: false,
    has_acroform: false,
    is_digitally_signed: false,
    pdfua_compliance_level: "",
    page_count: 2,
    has_embedded_files: false,
    is_certified: false,
    is_XFA: false,
    language: "en-US",
  },
  elements: [
    {
      Bounds: [
        76.72799682617188, 734.4232025146484, 171.43968200683594,
        743.8782348632812,
      ],
      ClipBounds: [
        76.72799682617188, 734.4232025146484, 171.43968200683594,
        743.8782348632812,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "FGDYYN+Arial-BoldMT",
        subset: true,
        weight: 700,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/P",
      Text: "NearBy Electronics ",
      TextSize: 10.080001831054688,
    },
    {
      Bounds: [
        76.72799682617188, 721.1031951904297, 214.52447509765625,
        730.5582427978516,
      ],
      ClipBounds: [
        76.72799682617188, 721.1031951904297, 214.52447509765625,
        730.5582427978516,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Page: 0,
      Path: "//Document/Sect/P[2]/Sub",
      Text: "3741 Glory Road, Jamestown, ",
      TextSize: 10.080001831054688,
      attributes: {
        Placement: "Block",
      },
    },
    {
      Bounds: [
        76.72799682617188, 708.1132049560547, 155.30166625976562,
        717.5682373046875,
      ],
      ClipBounds: [
        76.72799682617188, 708.1132049560547, 155.30166625976562,
        717.5682373046875,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Page: 0,
      Path: "//Document/Sect/P[2]/Sub[2]",
      Text: "Tennessee, USA ",
      TextSize: 10.080001831054688,
      attributes: {
        Placement: "Block",
      },
    },
    {
      Bounds: [
        76.72799682617188, 694.7931976318359, 107.43167114257812,
        704.2482452392578,
      ],
      ClipBounds: [
        76.72799682617188, 694.7931976318359, 107.43167114257812,
        704.2482452392578,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Page: 0,
      Path: "//Document/Sect/P[2]/Sub[3]",
      Text: "38556 ",
      TextSize: 10.080001831054688,
      attributes: {
        Placement: "Block",
      },
    },
    {
      Bounds: [
        390.1199951171875, 721.1031951904297, 543.1918334960938,
        730.5582427978516,
      ],
      ClipBounds: [
        390.1199951171875, 721.1031951904297, 543.1918334960938,
        730.5582427978516,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "FGDYYN+Arial-BoldMT",
        subset: true,
        weight: 700,
      },
      HasClip: true,
      Page: 0,
      Path: "//Document/Sect/P[3]/Sub",
      Text: "Invoice# NL57EPAS7793742478 ",
      TextSize: 10.080001831054688,
      attributes: {
        Placement: "Block",
      },
    },
    {
      Bounds: [
        491.3300018310547, 708.1132049560547, 543.2117614746094,
        717.5682373046875,
      ],
      ClipBounds: [
        491.3300018310547, 708.1132049560547, 543.2117614746094,
        717.5682373046875,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "FGDYYN+Arial-BoldMT",
        subset: true,
        weight: 700,
      },
      HasClip: true,
      Page: 0,
      Path: "//Document/Sect/P[3]/Sub[2]",
      Text: "Issue date ",
      TextSize: 10.080001831054688,
      attributes: {
        Placement: "Block",
      },
    },
    {
      Bounds: [
        489.1699981689453, 694.7931976318359, 543.3080749511719,
        704.2482452392578,
      ],
      ClipBounds: [
        489.1699981689453, 694.7931976318359, 543.3080749511719,
        704.2482452392578,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Page: 0,
      Path: "//Document/Sect/P[3]/Sub[3]",
      Text: "12-05-2023 ",
      TextSize: 10.080001831054688,
      attributes: {
        Placement: "Block",
      },
    },
    {
      Bounds: [
        76.72799682617188, 649.9085540771484, 295.7052459716797,
        673.2309875488281,
      ],
      ClipBounds: [
        76.72799682617188, 649.9085540771484, 295.7052459716797,
        673.2309875488281,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Title",
      Text: "NearBy Electronics ",
      TextSize: 24.863998413085938,
      attributes: {
        LineHeight: 29.875,
      },
    },
    {
      Bounds: [
        76.72799682617188, 633.9331970214844, 460.8868713378906,
        643.3882446289062,
      ],
      ClipBounds: [
        76.72799682617188, 633.9331970214844, 460.8868713378906,
        643.3882446289062,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/P[4]",
      Text: "We are here to serve you better. Reach out to us in case of any concern or feedbacks. ",
      TextSize: 10.080001831054688,
      attributes: {
        SpaceAfter: 18,
      },
    },
    {
      Bounds: [
        81.04800415039062, 580.9832000732422, 122.99087524414062,
        590.438232421875,
      ],
      ClipBounds: [
        81.04800415039062, 580.9832000732422, 122.99087524414062,
        590.438232421875,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "FGDYYN+Arial-BoldMT",
        subset: true,
        weight: 700,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/P[5]",
      Text: "BILL TO ",
      TextSize: 10.080001831054688,
    },
    {
      Bounds: [
        81.04800415039062, 567.6631927490234, 143.38272094726562,
        577.1182403564453,
      ],
      ClipBounds: [
        81.04800415039062, 567.6631927490234, 143.38272094726562,
        577.1182403564453,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Page: 0,
      Path: "//Document/Sect/P[6]/Sub",
      Text: "Willis Koelpin ",
      TextSize: 10.080001831054688,
      attributes: {
        Placement: "Block",
      },
    },
    {
      Bounds: [
        81.04800415039062, 554.6831970214844, 202.37088012695312,
        564.1382446289062,
      ],
      ClipBounds: [
        81.04800415039062, 554.6831970214844, 202.37088012695312,
        564.1382446289062,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Page: 0,
      Path: "//Document/Sect/P[6]/Sub[2]",
      Text: "Willis_Koelpin4@yahoo.co ",
      TextSize: 10.080001831054688,
      attributes: {
        Placement: "Block",
      },
    },
    {
      Bounds: [
        81.04800415039062, 541.3632049560547, 92.24681091308594,
        550.8182373046875,
      ],
      ClipBounds: [
        81.04800415039062, 541.3632049560547, 92.24681091308594,
        550.8182373046875,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Page: 0,
      Path: "//Document/Sect/P[6]/Sub[3]",
      Text: "m ",
      TextSize: 10.080001831054688,
      attributes: {
        Placement: "Block",
      },
    },
    {
      Bounds: [
        81.04800415039062, 528.0431976318359, 146.34808349609375,
        537.4982452392578,
      ],
      ClipBounds: [
        81.04800415039062, 528.0431976318359, 146.34808349609375,
        537.4982452392578,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Page: 0,
      Path: "//Document/Sect/P[6]/Sub[4]",
      Text: "783-402-5895 ",
      TextSize: 10.080001831054688,
      attributes: {
        Placement: "Block",
      },
    },
    {
      Bounds: [
        81.04800415039062, 514.7232055664062, 158.63375854492188,
        524.1782379150391,
      ],
      ClipBounds: [
        81.04800415039062, 514.7232055664062, 158.63375854492188,
        524.1782379150391,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Page: 0,
      Path: "//Document/Sect/P[6]/Sub[5]",
      Text: "353 Cara Shoals ",
      TextSize: 10.080001831054688,
      attributes: {
        Placement: "Block",
      },
    },
    {
      Bounds: [
        81.04800415039062, 501.7431945800781, 125.04719543457031,
        511.1982421875,
      ],
      ClipBounds: [
        81.04800415039062, 501.7431945800781, 125.04719543457031,
        511.1982421875,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Page: 0,
      Path: "//Document/Sect/P[6]/Sub[6]",
      Text: "Suchitlán ",
      TextSize: 10.080001831054688,
      attributes: {
        Placement: "Block",
      },
    },
    {
      Bounds: [
        240.25999450683594, 580.9832000732422, 286.1240692138672,
        590.438232421875,
      ],
      ClipBounds: [
        240.25999450683594, 580.9832000732422, 286.1240692138672,
        590.438232421875,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "FGDYYN+Arial-BoldMT",
        subset: true,
        weight: 700,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/P[7]",
      Text: "DETAILS ",
      TextSize: 10.080001831054688,
    },
    {
      Bounds: [
        240.25999450683594, 541.3632049560547, 371.68304443359375,
        577.1182403564453,
      ],
      ClipBounds: [
        240.25999450683594, 541.3632049560547, 371.68304443359375,
        577.1182403564453,
      ],
      Page: 0,
      Path: "//Document/Sect/Table",
      attributes: {
        BBox: [
          240.22999999999593, 541.3299999999872, 368.8649999999907,
          575.4089999999851,
        ],
        NumRow: 3,
        Placement: "Block",
        SpaceAfter: 18,
      },
    },
    {
      Bounds: [
        240.25999450683594, 567.6631927490234, 364.75807189941406,
        577.1182403564453,
      ],
      ClipBounds: [
        240.25999450683594, 567.6631927490234, 364.75807189941406,
        577.1182403564453,
      ],
      Page: 0,
      Path: "//Document/Sect/Table/TR/TD",
      attributes: {
        BBox: [
          240.22999999999593, 565.9289999999746, 368.8649999999907,
          575.4089999999851,
        ],
        BlockAlign: "Before",
        ColIndex: 0,
        Height: 9.5,
        InlineAlign: "Start",
        RowIndex: 0,
        Width: 128.625,
      },
    },
    {
      Bounds: [
        240.25999450683594, 567.6631927490234, 364.75807189941406,
        577.1182403564453,
      ],
      ClipBounds: [
        240.25999450683594, 567.6631927490234, 364.75807189941406,
        577.1182403564453,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table/TR/TD/P",
      Text: "minim velit velit fugiat culpa ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        240.25999450683594, 554.6831970214844, 371.68304443359375,
        564.1382446289062,
      ],
      ClipBounds: [
        240.25999450683594, 554.6831970214844, 371.68304443359375,
        564.1382446289062,
      ],
      Page: 0,
      Path: "//Document/Sect/Table/TR[2]/TD",
      attributes: {
        BBox: [
          240.22999999999593, 552.9699999999721, 368.8649999999907,
          565.9289999999746,
        ],
        BlockAlign: "Middle",
        ColIndex: 0,
        Height: 13,
        InlineAlign: "Start",
        RowIndex: 1,
        Width: 128.625,
      },
    },
    {
      Bounds: [
        240.25999450683594, 554.6831970214844, 371.68304443359375,
        564.1382446289062,
      ],
      ClipBounds: [
        240.25999450683594, 554.6831970214844, 371.68304443359375,
        564.1382446289062,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "fr",
      Page: 0,
      Path: "//Document/Sect/Table/TR[2]/TD/P",
      Text: "deserunt ex aliquip cillum est ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        240.25999450683594, 541.3632049560547, 333.2379150390625,
        550.8182373046875,
      ],
      ClipBounds: [
        240.25999450683594, 541.3632049560547, 333.2379150390625,
        550.8182373046875,
      ],
      Page: 0,
      Path: "//Document/Sect/Table/TR[3]/TD",
      attributes: {
        BBox: [
          240.22999999999593, 541.3299999999872, 368.8649999999907,
          552.9699999999721,
        ],
        BlockAlign: "Middle",
        ColIndex: 0,
        Height: 11.625,
        InlineAlign: "Start",
        RowIndex: 2,
        Width: 128.625,
      },
    },
    {
      Bounds: [
        240.25999450683594, 541.3632049560547, 333.2379150390625,
        550.8182373046875,
      ],
      ClipBounds: [
        240.25999450683594, 541.3632049560547, 333.2379150390625,
        550.8182373046875,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "it",
      Page: 0,
      Path: "//Document/Sect/Table/TR[3]/TD/P",
      Text: "aliqua ex amet amet ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        412.8000030517578, 580.9832000732422, 464.58103942871094,
        590.438232421875,
      ],
      ClipBounds: [
        412.8000030517578, 580.9832000732422, 464.58103942871094,
        590.438232421875,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "FGDYYN+Arial-BoldMT",
        subset: true,
        weight: 700,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/P[8]",
      Text: "PAYMENT ",
      TextSize: 10.080001831054688,
    },
    {
      Bounds: [
        412.8000030517578, 567.6631927490234, 513.0480804443359,
        577.1182403564453,
      ],
      ClipBounds: [
        412.8000030517578, 567.6631927490234, 513.0480804443359,
        577.1182403564453,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/P[9]",
      Text: "Due date: 08-07-2023 ",
      TextSize: 10.080001831054688,
      attributes: {
        SpaceAfter: 18,
      },
    },
    {
      Bounds: [
        410.63999938964844, 535.3764038085938, 459.87107849121094,
        545.844482421875,
      ],
      ClipBounds: [
        410.63999938964844, 535.3764038085938, 459.87107849121094,
        545.844482421875,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "FGDYYN+Arial-BoldMT",
        subset: true,
        weight: 700,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Aside/P",
      Text: "$22337.7 ",
      TextSize: 11.160003662109375,
      attributes: {
        SpaceAfter: 18,
      },
    },
    {
      Bounds: [
        77.447998046875, 430.0731964111328, 530.1510314941406,
        439.5282440185547,
      ],
      ClipBounds: [
        77.447998046875, 430.0731964111328, 530.1510314941406,
        439.5282440185547,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[2]",
      attributes: {
        BBox: [
          71.5170999999973, 414.73499999998603, 540.9379999999946,
          447.73399999999674,
        ],
        NumCol: 4,
        Placement: "Block",
        SpaceAfter: 18,
      },
    },
    {
      Bounds: [
        77.447998046875, 430.0731964111328, 104.47239685058594,
        439.5282440185547,
      ],
      ClipBounds: [
        77.447998046875, 430.0731964111328, 104.47239685058594,
        439.5282440185547,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[2]/TR/TD",
      attributes: {
        BBox: [
          71.5170999999973, 413.8949999999895, 358.78499999998894,
          447.73399999999674,
        ],
        BlockAlign: "Middle",
        BorderColor: [
          [0, 0, 0],
          [0.6235349999999755, 0.6235349999999755, 0.6235349999999755],
          [0, 0, 0],
          [0, 0, 0],
        ],
        BorderStyle: "Solid",
        BorderThickness: [0.625, 0.875, 0.5, 0.25],
        ColIndex: 0,
        Height: 33.875,
        InlineAlign: "Start",
        RowIndex: 0,
        Width: 287.25,
      },
    },
    {
      Bounds: [
        77.447998046875, 430.0731964111328, 104.47239685058594,
        439.5282440185547,
      ],
      ClipBounds: [
        77.447998046875, 430.0731964111328, 104.47239685058594,
        439.5282440185547,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "FGDYYN+Arial-BoldMT",
        subset: true,
        weight: 700,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[2]/TR/TD/P",
      Text: "ITEM ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        363.1000061035156, 430.0731964111328, 386.6570281982422,
        439.5282440185547,
      ],
      ClipBounds: [
        363.1000061035156, 430.0731964111328, 386.6570281982422,
        439.5282440185547,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[2]/TR/TD[2]",
      attributes: {
        BBox: [
          358.304999999993, 413.8949999999895, 415.6629999999859,
          447.73399999999674,
        ],
        BlockAlign: "Middle",
        BorderColor: [
          [0, 0, 0],
          [0.6235349999999755, 0.6235349999999755, 0.6235349999999755],
          [0, 0, 0],
          [0, 0, 0],
        ],
        BorderStyle: "Solid",
        BorderThickness: [0.625, 0.875, 0.25, 0.25],
        ColIndex: 1,
        Height: 33.875,
        InlineAlign: "Start",
        RowIndex: 0,
        Width: 57.375,
      },
    },
    {
      Bounds: [
        363.1000061035156, 430.0731964111328, 386.6570281982422,
        439.5282440185547,
      ],
      ClipBounds: [
        363.1000061035156, 430.0731964111328, 386.6570281982422,
        439.5282440185547,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "FGDYYN+Arial-BoldMT",
        subset: true,
        weight: 700,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[2]/TR/TD[2]/P",
      Text: "QTY ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        420.3800048828125, 430.0731964111328, 450.7712707519531,
        439.5282440185547,
      ],
      ClipBounds: [
        420.3800048828125, 430.0731964111328, 450.7712707519531,
        439.5282440185547,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[2]/TR/TD[3]",
      attributes: {
        BBox: [
          415.18299999999, 413.8949999999895, 481.8999999999942,
          447.73399999999674,
        ],
        BlockAlign: "Middle",
        BorderColor: [
          [0, 0, 0],
          [0.6235349999999755, 0.6235349999999755, 0.6235349999999755],
          [0, 0, 0],
          [0, 0, 0],
        ],
        BorderStyle: "Solid",
        BorderThickness: [0.625, 0.875, 0.25, 0.25],
        ColIndex: 2,
        Height: 33.875,
        InlineAlign: "Start",
        RowIndex: 0,
        Width: 66.75,
      },
    },
    {
      Bounds: [
        420.3800048828125, 430.0731964111328, 450.7712707519531,
        439.5282440185547,
      ],
      ClipBounds: [
        420.3800048828125, 430.0731964111328, 450.7712707519531,
        439.5282440185547,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "FGDYYN+Arial-BoldMT",
        subset: true,
        weight: 700,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[2]/TR/TD[3]/P",
      Text: "RATE ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        483.4100036621094, 430.0731964111328, 530.1510314941406,
        439.5282440185547,
      ],
      ClipBounds: [
        483.4100036621094, 430.0731964111328, 530.1510314941406,
        439.5282440185547,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[2]/TR/TD[4]",
      attributes: {
        BBox: [
          481.41999999999825, 413.8949999999895, 541.417999999976,
          447.73399999999674,
        ],
        BlockAlign: "Middle",
        BorderColor: [
          [0, 0, 0],
          [0.6235349999999755, 0.6235349999999755, 0.6235349999999755],
          [0, 0, 0],
          [0, 0, 0],
        ],
        BorderStyle: "Solid",
        BorderThickness: [0.625, 0.875, 0.25, 0.5],
        ColIndex: 3,
        Height: 33.875,
        InlineAlign: "Start",
        RowIndex: 0,
        Width: 60,
      },
    },
    {
      Bounds: [
        483.4100036621094, 430.0731964111328, 530.1510314941406,
        439.5282440185547,
      ],
      ClipBounds: [
        483.4100036621094, 430.0731964111328, 530.1510314941406,
        439.5282440185547,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "FGDYYN+Arial-BoldMT",
        subset: true,
        weight: 700,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[2]/TR/TD[4]/P",
      Text: "AMOUNT ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        77.447998046875, 226.5832061767578, 517.7280731201172,
        403.50823974609375,
      ],
      ClipBounds: [
        77.447998046875, 226.5832061767578, 517.7280731201172,
        403.50823974609375,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[3]",
      attributes: {
        BBox: [
          71.5170999999973, 209.42399999999907, 540.9379999999946,
          411.97499999999127,
        ],
        NumCol: 4,
        NumRow: 6,
        Placement: "Block",
        SpaceAfter: 18,
      },
    },
    {
      Bounds: [
        77.447998046875, 394.05320739746094, 177.693603515625,
        403.50823974609375,
      ],
      ClipBounds: [
        77.447998046875, 394.05320739746094, 177.693603515625,
        403.50823974609375,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR/TD",
      attributes: {
        BBox: [
          71.5170999999973, 376.33699999999953, 358.0649999999878,
          411.97499999999127,
        ],
        BlockAlign: "Before",
        BorderColor: [0, 0, 0],
        BorderStyle: "Solid",
        BorderThickness: [0.625, 0.25, 0.5, 0.25],
        ColIndex: 0,
        Height: 35.625,
        InlineAlign: "Start",
        RowIndex: 0,
        Width: 286.375,
      },
    },
    {
      Bounds: [
        77.447998046875, 394.05320739746094, 177.693603515625,
        403.50823974609375,
      ],
      ClipBounds: [
        77.447998046875, 394.05320739746094, 177.693603515625,
        403.50823974609375,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR/TD/P",
      Text: "Rustic Rubber Gloves ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        363.82000732421875, 394.05320739746094, 383.3751983642578,
        403.50823974609375,
      ],
      ClipBounds: [
        363.82000732421875, 394.05320739746094, 383.3751983642578,
        403.50823974609375,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR/TD[2]",
      attributes: {
        BBox: [
          357.58499999999185, 376.33699999999953, 414.22299999999814,
          411.97499999999127,
        ],
        BlockAlign: "Before",
        BorderColor: [0, 0, 0],
        BorderStyle: "Solid",
        BorderThickness: [0.625, 0.25, 0.25, 0.25],
        ColIndex: 1,
        Height: 35.625,
        InlineAlign: "Start",
        RowIndex: 0,
        Width: 56.625,
      },
    },
    {
      Bounds: [
        363.82000732421875, 394.05320739746094, 383.3751983642578,
        403.50823974609375,
      ],
      ClipBounds: [
        363.82000732421875, 394.05320739746094, 383.3751983642578,
        403.50823974609375,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR/TD[2]/P",
      Text: "102 ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        420.3800048828125, 394.05320739746094, 434.86000061035156,
        403.50823974609375,
      ],
      ClipBounds: [
        420.3800048828125, 394.05320739746094, 434.86000061035156,
        403.50823974609375,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR/TD[3]",
      attributes: {
        BBox: [
          413.74299999998766, 376.33699999999953, 481.8999999999942,
          411.97499999999127,
        ],
        BlockAlign: "Before",
        BorderColor: [0, 0, 0],
        BorderStyle: "Solid",
        BorderThickness: [0.625, 0.25, 0.25, 0.25],
        ColIndex: 2,
        Height: 35.625,
        InlineAlign: "Start",
        RowIndex: 0,
        Width: 68.125,
      },
    },
    {
      Bounds: [
        420.3800048828125, 394.05320739746094, 434.86000061035156,
        403.50823974609375,
      ],
      ClipBounds: [
        420.3800048828125, 394.05320739746094, 434.86000061035156,
        403.50823974609375,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR/TD[3]/P",
      Text: "29 ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        487.00999450683594, 394.05320739746094, 517.7280731201172,
        403.50823974609375,
      ],
      ClipBounds: [
        487.00999450683594, 394.05320739746094, 517.7280731201172,
        403.50823974609375,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR/TD[4]",
      attributes: {
        BBox: [
          481.41999999999825, 376.33699999999953, 541.417999999976,
          411.97499999999127,
        ],
        BlockAlign: "Before",
        BorderColor: [0, 0, 0],
        BorderStyle: "Solid",
        BorderThickness: [0.625, 0.25, 0.25, 0.5],
        ColIndex: 3,
        Height: 35.625,
        InlineAlign: "Start",
        RowIndex: 0,
        Width: 60,
      },
    },
    {
      Bounds: [
        487.00999450683594, 394.05320739746094, 517.7280731201172,
        403.50823974609375,
      ],
      ClipBounds: [
        487.00999450683594, 394.05320739746094, 517.7280731201172,
        403.50823974609375,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR/TD[4]/P",
      Text: "$2958 ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        77.447998046875, 360.5731964111328, 184.72943115234375,
        370.0282440185547,
      ],
      ClipBounds: [
        77.447998046875, 360.5731964111328, 184.72943115234375,
        370.0282440185547,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[2]/TD",
      attributes: {
        BBox: [
          71.5170999999973, 344.6579999999958, 358.0649999999878,
          376.81699999999546,
        ],
        BlockAlign: "Before",
        BorderColor: [0, 0, 0],
        BorderStyle: "Solid",
        BorderThickness: [0.25, 0.25, 0.5, 0.25],
        ColIndex: 0,
        Height: 32.125,
        InlineAlign: "Start",
        RowIndex: 1,
        Width: 286.375,
      },
    },
    {
      Bounds: [
        77.447998046875, 360.5731964111328, 184.72943115234375,
        370.0282440185547,
      ],
      ClipBounds: [
        77.447998046875, 360.5731964111328, 184.72943115234375,
        370.0282440185547,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[2]/TD/P",
      Text: "Fantastic Granite Salad ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        363.82000732421875, 360.5731964111328, 378.3000030517578,
        370.0282440185547,
      ],
      ClipBounds: [
        363.82000732421875, 360.5731964111328, 378.3000030517578,
        370.0282440185547,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[2]/TD[2]",
      attributes: {
        BBox: [
          357.58499999999185, 344.6579999999958, 414.22299999999814,
          376.81699999999546,
        ],
        BlockAlign: "Before",
        BorderColor: [0, 0, 0],
        BorderStyle: "Solid",
        BorderThickness: 0.25,
        ColIndex: 1,
        Height: 32.125,
        InlineAlign: "Start",
        RowIndex: 1,
        Width: 56.625,
      },
    },
    {
      Bounds: [
        363.82000732421875, 360.5731964111328, 378.3000030517578,
        370.0282440185547,
      ],
      ClipBounds: [
        363.82000732421875, 360.5731964111328, 378.3000030517578,
        370.0282440185547,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[2]/TD[2]/P",
      Text: "39 ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        420.3800048828125, 360.5731964111328, 434.86000061035156,
        370.0282440185547,
      ],
      ClipBounds: [
        420.3800048828125, 360.5731964111328, 434.86000061035156,
        370.0282440185547,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[2]/TD[3]",
      attributes: {
        BBox: [
          413.74299999998766, 344.6579999999958, 481.8999999999942,
          376.81699999999546,
        ],
        BlockAlign: "Before",
        BorderColor: [0, 0, 0],
        BorderStyle: "Solid",
        BorderThickness: 0.25,
        ColIndex: 2,
        Height: 32.125,
        InlineAlign: "Start",
        RowIndex: 1,
        Width: 68.125,
      },
    },
    {
      Bounds: [
        420.3800048828125, 360.5731964111328, 434.86000061035156,
        370.0282440185547,
      ],
      ClipBounds: [
        420.3800048828125, 360.5731964111328, 434.86000061035156,
        370.0282440185547,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[2]/TD[3]/P",
      Text: "27 ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        487.00999450683594, 360.5731964111328, 517.7280731201172,
        370.0282440185547,
      ],
      ClipBounds: [
        487.00999450683594, 360.5731964111328, 517.7280731201172,
        370.0282440185547,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[2]/TD[4]",
      attributes: {
        BBox: [
          481.41999999999825, 344.6579999999958, 541.417999999976,
          376.81699999999546,
        ],
        BlockAlign: "Before",
        BorderColor: [0, 0, 0],
        BorderStyle: "Solid",
        BorderThickness: [0.25, 0.25, 0.25, 0.5],
        ColIndex: 3,
        Height: 32.125,
        InlineAlign: "Start",
        RowIndex: 1,
        Width: 60,
      },
    },
    {
      Bounds: [
        487.00999450683594, 360.5731964111328, 517.7280731201172,
        370.0282440185547,
      ],
      ClipBounds: [
        487.00999450683594, 360.5731964111328, 517.7280731201172,
        370.0282440185547,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[2]/TD[4]/P",
      Text: "$1053 ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        77.447998046875, 327.0632019042969, 162.06959533691406,
        336.5182342529297,
      ],
      ClipBounds: [
        77.447998046875, 327.0632019042969, 162.06959533691406,
        336.5182342529297,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[3]/TD",
      attributes: {
        BBox: [
          71.5170999999973, 310.09999999999127, 358.0649999999878,
          345.13799999999173,
        ],
        BlockAlign: "Middle",
        BorderColor: [0, 0, 0],
        BorderStyle: "Solid",
        BorderThickness: [0.25, 0.25, 0.5, 0.25],
        ColIndex: 0,
        Height: 35,
        InlineAlign: "Start",
        RowIndex: 2,
        Width: 286.375,
      },
    },
    {
      Bounds: [
        77.447998046875, 327.0632019042969, 162.06959533691406,
        336.5182342529297,
      ],
      ClipBounds: [
        77.447998046875, 327.0632019042969, 162.06959533691406,
        336.5182342529297,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[3]/TD/P",
      Text: "Small Fresh Salad ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        363.82000732421875, 327.0632019042969, 378.3000030517578,
        336.5182342529297,
      ],
      ClipBounds: [
        363.82000732421875, 327.0632019042969, 378.3000030517578,
        336.5182342529297,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[3]/TD[2]",
      attributes: {
        BBox: [
          357.58499999999185, 310.09999999999127, 414.22299999999814,
          345.13799999999173,
        ],
        BlockAlign: "Middle",
        BorderColor: [0, 0, 0],
        BorderStyle: "Solid",
        BorderThickness: 0.25,
        ColIndex: 1,
        Height: 35,
        InlineAlign: "Start",
        RowIndex: 2,
        Width: 56.625,
      },
    },
    {
      Bounds: [
        363.82000732421875, 327.0632019042969, 378.3000030517578,
        336.5182342529297,
      ],
      ClipBounds: [
        363.82000732421875, 327.0632019042969, 378.3000030517578,
        336.5182342529297,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[3]/TD[2]/P",
      Text: "95 ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        420.3800048828125, 327.0632019042969, 434.86000061035156,
        336.5182342529297,
      ],
      ClipBounds: [
        420.3800048828125, 327.0632019042969, 434.86000061035156,
        336.5182342529297,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[3]/TD[3]",
      attributes: {
        BBox: [
          413.74299999998766, 310.09999999999127, 481.8999999999942,
          345.13799999999173,
        ],
        BlockAlign: "Middle",
        BorderColor: [0, 0, 0],
        BorderStyle: "Solid",
        BorderThickness: 0.25,
        ColIndex: 2,
        Height: 35,
        InlineAlign: "Start",
        RowIndex: 2,
        Width: 68.125,
      },
    },
    {
      Bounds: [
        420.3800048828125, 327.0632019042969, 434.86000061035156,
        336.5182342529297,
      ],
      ClipBounds: [
        420.3800048828125, 327.0632019042969, 434.86000061035156,
        336.5182342529297,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[3]/TD[3]/P",
      Text: "69 ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        487.00999450683594, 327.0632019042969, 517.7280731201172,
        336.5182342529297,
      ],
      ClipBounds: [
        487.00999450683594, 327.0632019042969, 517.7280731201172,
        336.5182342529297,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[3]/TD[4]",
      attributes: {
        BBox: [
          481.41999999999825, 310.09999999999127, 541.417999999976,
          345.13799999999173,
        ],
        BlockAlign: "Middle",
        BorderColor: [0, 0, 0],
        BorderStyle: "Solid",
        BorderThickness: [0.25, 0.25, 0.25, 0.5],
        ColIndex: 3,
        Height: 35,
        InlineAlign: "Start",
        RowIndex: 2,
        Width: 60,
      },
    },
    {
      Bounds: [
        487.00999450683594, 327.0632019042969, 517.7280731201172,
        336.5182342529297,
      ],
      ClipBounds: [
        487.00999450683594, 327.0632019042969, 517.7280731201172,
        336.5182342529297,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[3]/TD[4]/P",
      Text: "$6555 ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        77.447998046875, 293.5632019042969, 176.59487915039062,
        303.0182342529297,
      ],
      ClipBounds: [
        77.447998046875, 293.5632019042969, 176.59487915039062,
        303.0182342529297,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[4]/TD",
      attributes: {
        BBox: [
          71.5170999999973, 275.54099999999744, 358.0649999999878,
          310.5799999999872,
        ],
        BlockAlign: "Before",
        BorderColor: [0, 0, 0],
        BorderStyle: "Solid",
        BorderThickness: [0.25, 0.25, 0.5, 0.25],
        ColIndex: 0,
        Height: 35,
        InlineAlign: "Start",
        RowIndex: 3,
        Width: 286.375,
      },
    },
    {
      Bounds: [
        77.447998046875, 293.5632019042969, 176.59487915039062,
        303.0182342529297,
      ],
      ClipBounds: [
        77.447998046875, 293.5632019042969, 176.59487915039062,
        303.0182342529297,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[4]/TD/P",
      Text: "Fantastic Metal Chips ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        363.82000732421875, 293.5632019042969, 378.3000030517578,
        303.0182342529297,
      ],
      ClipBounds: [
        363.82000732421875, 293.5632019042969, 378.3000030517578,
        303.0182342529297,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[4]/TD[2]",
      attributes: {
        BBox: [
          357.58499999999185, 275.54099999999744, 414.22299999999814,
          310.5799999999872,
        ],
        BlockAlign: "Before",
        BorderColor: [0, 0, 0],
        BorderStyle: "Solid",
        BorderThickness: 0.25,
        ColIndex: 1,
        Height: 35,
        InlineAlign: "Start",
        RowIndex: 3,
        Width: 56.625,
      },
    },
    {
      Bounds: [
        363.82000732421875, 293.5632019042969, 378.3000030517578,
        303.0182342529297,
      ],
      ClipBounds: [
        363.82000732421875, 293.5632019042969, 378.3000030517578,
        303.0182342529297,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[4]/TD[2]/P",
      Text: "67 ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        420.3800048828125, 293.5632019042969, 434.86000061035156,
        303.0182342529297,
      ],
      ClipBounds: [
        420.3800048828125, 293.5632019042969, 434.86000061035156,
        303.0182342529297,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[4]/TD[3]",
      attributes: {
        BBox: [
          413.74299999998766, 275.54099999999744, 481.8999999999942,
          310.5799999999872,
        ],
        BlockAlign: "Before",
        BorderColor: [0, 0, 0],
        BorderStyle: "Solid",
        BorderThickness: 0.25,
        ColIndex: 2,
        Height: 35,
        InlineAlign: "Start",
        RowIndex: 3,
        Width: 68.125,
      },
    },
    {
      Bounds: [
        420.3800048828125, 293.5632019042969, 434.86000061035156,
        303.0182342529297,
      ],
      ClipBounds: [
        420.3800048828125, 293.5632019042969, 434.86000061035156,
        303.0182342529297,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[4]/TD[3]/P",
      Text: "49 ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        487.00999450683594, 293.5632019042969, 517.7280731201172,
        303.0182342529297,
      ],
      ClipBounds: [
        487.00999450683594, 293.5632019042969, 517.7280731201172,
        303.0182342529297,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[4]/TD[4]",
      attributes: {
        BBox: [
          481.41999999999825, 275.54099999999744, 541.417999999976,
          310.5799999999872,
        ],
        BlockAlign: "Before",
        BorderColor: [0, 0, 0],
        BorderStyle: "Solid",
        BorderThickness: [0.25, 0.25, 0.25, 0.5],
        ColIndex: 3,
        Height: 35,
        InlineAlign: "Start",
        RowIndex: 3,
        Width: 60,
      },
    },
    {
      Bounds: [
        487.00999450683594, 293.5632019042969, 517.7280731201172,
        303.0182342529297,
      ],
      ClipBounds: [
        487.00999450683594, 293.5632019042969, 517.7280731201172,
        303.0182342529297,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[4]/TD[4]/P",
      Text: "$3283 ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        77.447998046875, 260.0832061767578, 175.5465545654297,
        269.5382385253906,
      ],
      ClipBounds: [
        77.447998046875, 260.0832061767578, 175.5465545654297,
        269.5382385253906,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[5]/TD",
      attributes: {
        BBox: [
          71.5170999999973, 243.8619999999937, 358.0649999999878,
          276.02099999999336,
        ],
        BlockAlign: "Before",
        BorderColor: [0, 0, 0],
        BorderStyle: "Solid",
        BorderThickness: [0.25, 0.25, 0.5, 0.25],
        ColIndex: 0,
        Height: 32.125,
        InlineAlign: "Start",
        RowIndex: 4,
        Width: 286.375,
      },
    },
    {
      Bounds: [
        77.447998046875, 260.0832061767578, 175.5465545654297,
        269.5382385253906,
      ],
      ClipBounds: [
        77.447998046875, 260.0832061767578, 175.5465545654297,
        269.5382385253906,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[5]/TD/P",
      Text: "Refined Cotton Pants ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        363.82000732421875, 260.0832061767578, 378.3000030517578,
        269.5382385253906,
      ],
      ClipBounds: [
        363.82000732421875, 260.0832061767578, 378.3000030517578,
        269.5382385253906,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[5]/TD[2]",
      attributes: {
        BBox: [
          357.58499999999185, 243.8619999999937, 414.22299999999814,
          276.02099999999336,
        ],
        BlockAlign: "Before",
        BorderColor: [0, 0, 0],
        BorderStyle: "Solid",
        BorderThickness: 0.25,
        ColIndex: 1,
        Height: 32.125,
        InlineAlign: "Start",
        RowIndex: 4,
        Width: 56.625,
      },
    },
    {
      Bounds: [
        363.82000732421875, 260.0832061767578, 378.3000030517578,
        269.5382385253906,
      ],
      ClipBounds: [
        363.82000732421875, 260.0832061767578, 378.3000030517578,
        269.5382385253906,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[5]/TD[2]/P",
      Text: "79 ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        420.3800048828125, 260.0832061767578, 434.86000061035156,
        269.5382385253906,
      ],
      ClipBounds: [
        420.3800048828125, 260.0832061767578, 434.86000061035156,
        269.5382385253906,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[5]/TD[3]",
      attributes: {
        BBox: [
          413.74299999998766, 243.8619999999937, 481.8999999999942,
          276.02099999999336,
        ],
        BlockAlign: "Before",
        BorderColor: [0, 0, 0],
        BorderStyle: "Solid",
        BorderThickness: 0.25,
        ColIndex: 2,
        Height: 32.125,
        InlineAlign: "Start",
        RowIndex: 4,
        Width: 68.125,
      },
    },
    {
      Bounds: [
        420.3800048828125, 260.0832061767578, 434.86000061035156,
        269.5382385253906,
      ],
      ClipBounds: [
        420.3800048828125, 260.0832061767578, 434.86000061035156,
        269.5382385253906,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[5]/TD[3]/P",
      Text: "72 ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        487.00999450683594, 260.0832061767578, 517.7280731201172,
        269.5382385253906,
      ],
      ClipBounds: [
        487.00999450683594, 260.0832061767578, 517.7280731201172,
        269.5382385253906,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[5]/TD[4]",
      attributes: {
        BBox: [
          481.41999999999825, 243.8619999999937, 541.417999999976,
          276.02099999999336,
        ],
        BlockAlign: "Before",
        BorderColor: [0, 0, 0],
        BorderStyle: "Solid",
        BorderThickness: [0.25, 0.25, 0.25, 0.5],
        ColIndex: 3,
        Height: 32.125,
        InlineAlign: "Start",
        RowIndex: 4,
        Width: 60,
      },
    },
    {
      Bounds: [
        487.00999450683594, 260.0832061767578, 517.7280731201172,
        269.5382385253906,
      ],
      ClipBounds: [
        487.00999450683594, 260.0832061767578, 517.7280731201172,
        269.5382385253906,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[5]/TD[4]/P",
      Text: "$5688 ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        77.447998046875, 226.5832061767578, 206.0990447998047,
        236.03823852539062,
      ],
      ClipBounds: [
        77.447998046875, 226.5832061767578, 206.0990447998047,
        236.03823852539062,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[6]/TD",
      attributes: {
        BBox: [
          71.5170999999973, 208.82399999999325, 358.0649999999878,
          244.34199999999691,
        ],
        BlockAlign: "Middle",
        BorderColor: [0, 0, 0],
        BorderStyle: "Solid",
        BorderThickness: [0.25, 0.625, 0.5, 0.25],
        ColIndex: 0,
        Height: 35.5,
        InlineAlign: "Start",
        RowIndex: 5,
        Width: 286.375,
      },
    },
    {
      Bounds: [
        77.447998046875, 226.5832061767578, 206.0990447998047,
        236.03823852539062,
      ],
      ClipBounds: [
        77.447998046875, 226.5832061767578, 206.0990447998047,
        236.03823852539062,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[6]/TD/P",
      Text: "Ergonomic Concrete Towels ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        363.82000732421875, 226.5832061767578, 378.3000030517578,
        236.03823852539062,
      ],
      ClipBounds: [
        363.82000732421875, 226.5832061767578, 378.3000030517578,
        236.03823852539062,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[6]/TD[2]",
      attributes: {
        BBox: [
          357.58499999999185, 208.82399999999325, 414.22299999999814,
          244.34199999999691,
        ],
        BlockAlign: "Middle",
        BorderColor: [0, 0, 0],
        BorderStyle: "Solid",
        BorderThickness: [0.25, 0.625, 0.25, 0.25],
        ColIndex: 1,
        Height: 35.5,
        InlineAlign: "Start",
        RowIndex: 5,
        Width: 56.625,
      },
    },
    {
      Bounds: [
        363.82000732421875, 226.5832061767578, 378.3000030517578,
        236.03823852539062,
      ],
      ClipBounds: [
        363.82000732421875, 226.5832061767578, 378.3000030517578,
        236.03823852539062,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[6]/TD[2]/P",
      Text: "35 ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        420.3800048828125, 226.5832061767578, 434.86000061035156,
        236.03823852539062,
      ],
      ClipBounds: [
        420.3800048828125, 226.5832061767578, 434.86000061035156,
        236.03823852539062,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[6]/TD[3]",
      attributes: {
        BBox: [
          413.74299999998766, 208.82399999999325, 481.8999999999942,
          244.34199999999691,
        ],
        BlockAlign: "Middle",
        BorderColor: [0, 0, 0],
        BorderStyle: "Solid",
        BorderThickness: [0.25, 0.625, 0.25, 0.25],
        ColIndex: 2,
        Height: 35.5,
        InlineAlign: "Start",
        RowIndex: 5,
        Width: 68.125,
      },
    },
    {
      Bounds: [
        420.3800048828125, 226.5832061767578, 434.86000061035156,
        236.03823852539062,
      ],
      ClipBounds: [
        420.3800048828125, 226.5832061767578, 434.86000061035156,
        236.03823852539062,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[6]/TD[3]/P",
      Text: "22 ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        487.00999450683594, 226.5832061767578, 512.3251953125,
        236.03823852539062,
      ],
      ClipBounds: [
        487.00999450683594, 226.5832061767578, 512.3251953125,
        236.03823852539062,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[6]/TD[4]",
      attributes: {
        BBox: [
          481.41999999999825, 208.82399999999325, 541.417999999976,
          244.34199999999691,
        ],
        BlockAlign: "Middle",
        BorderColor: [0, 0, 0],
        BorderStyle: "Solid",
        BorderThickness: [0.25, 0.625, 0.25, 0.5],
        ColIndex: 3,
        Height: 35.5,
        InlineAlign: "Start",
        RowIndex: 5,
        Width: 60,
      },
    },
    {
      Bounds: [
        487.00999450683594, 226.5832061767578, 512.3251953125,
        236.03823852539062,
      ],
      ClipBounds: [
        487.00999450683594, 226.5832061767578, 512.3251953125,
        236.03823852539062,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[3]/TR[6]/TD[4]/P",
      Text: "$770 ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        77.447998046875, 113.13319396972656, 522.3792724609375,
        156.0682373046875,
      ],
      ClipBounds: [
        77.447998046875, 113.13319396972656, 522.3792724609375,
        156.0682373046875,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[4]",
      attributes: {
        BBox: [
          77.03689999999915, 115.22799999999916, 519.8189999999886,
          154.34599999999773,
        ],
        NumCol: 2,
        NumRow: 2,
        Placement: "Block",
        SpaceAfter: 18,
      },
    },
    {
      Bounds: [
        77.447998046875, 146.6132049560547, 120.4593505859375,
        156.0682373046875,
      ],
      ClipBounds: [
        77.447998046875, 146.6132049560547, 120.4593505859375,
        156.0682373046875,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[4]/TR/TD",
      attributes: {
        BBox: [
          77.03689999999915, 129.62699999999313, 358.54499999999825,
          154.34599999999773,
        ],
        BlockAlign: "Before",
        ColIndex: 0,
        Height: 24.75,
        InlineAlign: "Start",
        RowIndex: 0,
        Width: 281.5,
      },
    },
    {
      Bounds: [
        77.447998046875, 146.6132049560547, 120.4593505859375,
        156.0682373046875,
      ],
      ClipBounds: [
        77.447998046875, 146.6132049560547, 120.4593505859375,
        156.0682373046875,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "FGDYYN+Arial-BoldMT",
        subset: true,
        weight: 700,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[4]/TR/TD/P",
      Text: "Subtotal ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        485.92999267578125, 146.6132049560547, 522.3792724609375,
        156.0682373046875,
      ],
      ClipBounds: [
        485.92999267578125, 146.6132049560547, 522.3792724609375,
        156.0682373046875,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[4]/TR/TD[2]",
      attributes: {
        BBox: [
          358.54499999999825, 129.62699999999313, 519.8189999999886,
          154.34599999999773,
        ],
        BlockAlign: "Before",
        ColIndex: 1,
        Height: 24.75,
        InlineAlign: "End",
        RowIndex: 0,
        Width: 161.25,
      },
    },
    {
      Bounds: [
        485.92999267578125, 146.6132049560547, 522.3792724609375,
        156.0682373046875,
      ],
      ClipBounds: [
        485.92999267578125, 146.6132049560547, 522.3792724609375,
        156.0682373046875,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[4]/TR/TD[2]/P",
      Text: "$20307 ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        77.447998046875, 113.13319396972656, 109.73143005371094,
        122.58824157714844,
      ],
      ClipBounds: [
        77.447998046875, 113.13319396972656, 109.73143005371094,
        122.58824157714844,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[4]/TR[2]/TD",
      attributes: {
        BBox: [
          77.03689999999915, 115.22799999999916, 358.54499999999825,
          129.62699999999313,
        ],
        BlockAlign: "After",
        ColIndex: 0,
        Height: 14.375,
        InlineAlign: "Start",
        RowIndex: 1,
        Width: 281.5,
      },
    },
    {
      Bounds: [
        77.447998046875, 113.13319396972656, 109.73143005371094,
        122.58824157714844,
      ],
      ClipBounds: [
        77.447998046875, 113.13319396972656, 109.73143005371094,
        122.58824157714844,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "FGDYYN+Arial-BoldMT",
        subset: true,
        weight: 700,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[4]/TR[2]/TD/P",
      Text: "Tax % ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        485.92999267578125, 113.13319396972656, 500.4100036621094,
        122.58824157714844,
      ],
      ClipBounds: [
        485.92999267578125, 113.13319396972656, 500.4100036621094,
        122.58824157714844,
      ],
      Page: 0,
      Path: "//Document/Sect/Table[4]/TR[2]/TD[2]",
      attributes: {
        BBox: [
          358.54499999999825, 115.22799999999916, 519.8189999999886,
          129.62699999999313,
        ],
        BlockAlign: "After",
        ColIndex: 1,
        Height: 14.375,
        InlineAlign: "End",
        RowIndex: 1,
        Width: 161.25,
      },
    },
    {
      Bounds: [
        485.92999267578125, 113.13319396972656, 500.4100036621094,
        122.58824157714844,
      ],
      ClipBounds: [
        485.92999267578125, 113.13319396972656, 500.4100036621094,
        122.58824157714844,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 0,
      Path: "//Document/Sect/Table[4]/TR[2]/TD[2]/P",
      Text: "10 ",
      TextSize: 10.080001831054688,
      attributes: {
        LineHeight: 12.125,
      },
    },
    {
      Bounds: [
        77.447998046875, 650.8531951904297, 126.14447021484375,
        660.3082427978516,
      ],
      ClipBounds: [
        77.447998046875, 650.8531951904297, 126.14447021484375,
        660.3082427978516,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "FGDYYN+Arial-BoldMT",
        subset: true,
        weight: 700,
      },
      HasClip: true,
      Lang: "en",
      Page: 1,
      Path: "//Document/Sect/P[10]",
      Text: "Total Due ",
      TextSize: 10.080001831054688,
    },
    {
      Bounds: [
        485.92999267578125, 648.9199981689453, 526.1329956054688,
        657.3619995117188,
      ],
      ClipBounds: [
        485.92999267578125, 648.9199981689453, 526.1329956054688,
        657.3619995117188,
      ],
      Font: {
        alt_family_name: "Arial",
        embedded: true,
        encoding: "WinAnsiEncoding",
        family_name: "Arial MT",
        font_type: "TrueType",
        italic: false,
        monospaced: false,
        name: "QHQHWR+ArialMT",
        subset: true,
        weight: 400,
      },
      HasClip: true,
      Lang: "en",
      Page: 1,
      Path: "//Document/Sect/P[11]",
      Text: "$22337.7 ",
      TextSize: 9,
      attributes: {
        LineHeight: 10.75,
        TextAlign: "End",
      },
    },
  ],
  pages: [
    {
      boxes: {
        CropBox: [0, 0, 612, 792],
        MediaBox: [0, 0, 612, 792],
      },
      height: 792,
      is_scanned: false,
      page_number: 0,
      rotation: 0,
      width: 612,
    },
    {
      boxes: {
        CropBox: [0, 0, 612, 792],
        MediaBox: [0, 0, 612, 792],
      },
      height: 792,
      is_scanned: false,
      page_number: 1,
      rotation: 0,
      width: 612,
    },
  ],
};

const funcCall = parseApiResponse(jsonData);
console.log(funcCall);
