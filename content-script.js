console.log("Content script loaded"); // Log that the content script has loaded

// Function to load the CSV file and return the values as an array
async function loadCSV(url) {
    url = browser.runtime.getURL(url); // Get the full URL of the CSV file
    const response = await fetch(url);
    const data = await response.text();

    // Parse the CSV into an array of objects
    const rows = data.split('\r\n').map(row => row.split(';'));
    return rows; // returns an array of arrays
}

function matchElementsWithCSV(csvData) {
    // Assuming your XPath to find elements of interest
    const xpath = "//*[contains(@class, 'subtitle')]"; // Adjust as needed
    const nodesSnapshot = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    console.log(`XPath evaluated: ${xpath}, found ${nodesSnapshot.snapshotLength} elements.`);

    for (let i = 0; i < nodesSnapshot.snapshotLength; i++) {
        const element = nodesSnapshot.snapshotItem(i);
        const elementText = element.textContent.trim();
        console.log(`Checking element ${i + 1}:`, elementText);

        // Check against the first column of CSV data
        for (let j = 0; j < csvData.length; j++) {
            const [firstColumnValue, secondColumnValue, thirdColumnValue] = csvData[j];
            if (elementText === firstColumnValue.trim()) {
                console.log(`Match found: ${firstColumnValue} => ${secondColumnValue}`);

                element.style.backgroundColor = '#8E3B46'; // '#E24879'; Change background color to red
                element.style.color = "#000000";
                // Create a new element to display the second column value
                const displayElement = document.createElement('div');
                displayElement.textContent = secondColumnValue + " - " + thirdColumnValue + " Reviews"; // Set the text content
                displayElement.className = "csv-display"; // Adding class for easier removal
                displayElement.style.color = "white"; // Change text color for better visibility
                // displayElement.style.fontWeight = 'bold'; // Make the text bold
                element.appendChild(displayElement); // Append to the matched element or place it as needed
            }
        }
    }
}


const csvUrl = 'data/companies.csv';

loadCSV(csvUrl).then(csvData => {
    console.log("CSV Data Loaded:", csvData);

    // Proceed with element matching logic
    matchElementsWithCSV(csvData);

    // Set an interval to rerun the matching function every second
    setInterval(() => {
        matchElementsWithCSV(csvData);
    }, 3000); // 1000 milliseconds = 1 second
});
