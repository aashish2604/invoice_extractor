// Function to get parse the combined address string to a JSON
function parseBusinessAddress(address) {
  let splittedArray = address.split(",");

  let state = splittedArray[2].trim();
  let lastElement = splittedArray[3].trim();

  const replaced = lastElement.replace(/\D/g, "");

  let zipcode;

  if (replaced !== "") {
    zipcode = Number(replaced);
  }

  let country = lastElement.replace(replaced, "").trim();

  let responseJson = {
    street: splittedArray[0].trim(),
    city: splittedArray[1].trim(),
    country: state + ", " + country,
    zipcode: zipcode,
  };

  return responseJson;
}

// Function to parse the Invoice Number and date from combined string to JSON
function parseInvoiceNumberAndIssueDate(data) {
  data = data.replace("Invoice# ", "");
  data = data.replace("Issue date ", "");
  data = data.trim();
  let dataArray = data.split(" ");
  let issueDateString = dataArray.pop().trim();
  let dateParts = issueDateString.split("-");
  let issueDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
  let invoiceNumber = dataArray.pop().trim();
  return {
    invoiceNumber: invoiceNumber,
    issueDate: issueDateString,
  };
}

// Function to parse the bill details items from a List to a JSON
function parseBillItemDetails(data) {
  let i = 0;
  let billItemDetailsJson = [];
  while (i < data.length) {
    let currentItemData = {
      Invoice__BillDetails__Name: data[i].trim(),
      Invoice__BillDetails__Quantity: Number(data[i + 1].trim()),
      Invoice__BillDetails__Rate: Number(data[i + 2].trim()),
    };
    billItemDetailsJson.push(currentItemData);
    i += 4;
  }
  return billItemDetailsJson;
}

// Function to parse the customer details from a string to a JSON
function parseCustomerDetails(data) {
  let name = "";
  let email = "";
  let phoneNumber = "";
  let addressLine1 = "";
  let addressLine2 = "";

  data.replace("BILL TO ", "");
  let dataArray = data.split(" ");
  let i = 0;
  while (!dataArray[i].includes("@")) {
    name += dataArray.shift() + " ";
  }

  while (!(dataArray[i][3] === "-" && dataArray[i][7] === "-")) {
    email += dataArray.shift();
  }

  phoneNumber = dataArray.shift();
  addressLine1 =
    dataArray.shift() + " " + dataArray.shift() + " " + dataArray.shift();
  while (dataArray.length > 0) {
    addressLine2 += dataArray.shift()+" ";
  }

  return {
    name: name.trim(),
    email: email.trim(),
    phoneNo: phoneNumber.trim(),
    addressLine1: addressLine1.trim(),
    addressLine2: addressLine2.trim(),
  };
}

// Function to sort the file names of input directory
function sortFileNames(strings) {
    const numericSort = (a, b) => {
      const numericA = parseInt(a.match(/\d+/)[0]);
      const numericB = parseInt(b.match(/\d+/)[0]);
      return numericA - numericB;
    };
  
    return strings.sort(numericSort);
  }

module.exports = {
  parseBusinessAddress,
  parseInvoiceNumberAndIssueDate,
  parseBillItemDetails,
  parseCustomerDetails,
  sortFileNames,
};
