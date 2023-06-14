

function convertJSONtoCSV(jsonData) {
    // Parse JSON data into an array of objects
    const data = JSON.parse(jsonData);
  
    // Extract column names/headers
    const columns = Object.keys(data[0]);
  
    // Create CSV header row
    const headerRow = columns.join(',');
  
    // Create CSV data rows
    const dataRows = data.map(obj => {
      return columns.map(column => {
        return obj[column];
      }).join(',');
    });
  
    // Combine header row and data rows
    const csvData = [headerRow, ...dataRows].join('\n');
  
    return csvData;
  }
  
  // Example JSON data
  const jsonData = '[{"name": "John", "age": 30, "city": "New York"}, {"name": "Jane", "age": 25, "city": "London"}]';
  
  // Convert JSON to CSV
  const csvData = convertJSONtoCSV(jsonData);
  
  // Print the resulting CSV data
  console.log(csvData);
  