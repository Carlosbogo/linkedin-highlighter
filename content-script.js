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
                if (parseFloat(secondColumnValue.trim()) >= 4.5) {
                    element.style.backgroundColor = '#8E3B46';
                    element.style.color = "#000000";
                } else {
                    element.style.backgroundColor = '#7261A3';
                    element.style.color = "#000000";
                }
                // element.style.backgroundColor = '#8E3B46'; // '#E24879'; Change background color to red
                // element.style.color = "#000000";
                // Create a new element to display the second column value
                const displayElement = document.createElement('div');
                displayElement.textContent = secondColumnValue + " - " + thirdColumnValue + " Reviews"; // Set the text content
                displayElement.className = "csv-display"; // Adding class for easier removal
                displayElement.style.color = "white"; // Change text color for better visibility
                // displayElement.style.fontWeight = 'bold'; // Make the text bold
                element.appendChild(displayElement); // Append to the matched element or place it as needed
            } else {
                console.log(`No match found for: ${firstColumnValue}`);
                const liParent = element.closest('li');
                if (liParent) {
                    liParent.remove(); // Remove the closest <li> parent
                    console.log('<li> element removed.');
                }
            }
        }
    }
}


// Function to observe DOM mutations (new elements being added)
function observeNewElements(csvData) {
    const observer = new MutationObserver((mutationsList) => {
        mutationsList.forEach(mutation => {
            if (mutation.addedNodes.length > 0) {
                const newElements = [];

                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Check if it's an element node
                        const xpath = "//*[contains(@class, 'subtitle')]";
                        const nodesSnapshot = document.evaluate(xpath, node, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

                        for (let i = 0; i < nodesSnapshot.snapshotLength; i++) {
                            newElements.push(nodesSnapshot.snapshotItem(i));
                        }
                    }
                });

                if (newElements.length > 0) {
                    console.log(`New elements found: ${newElements.length}`);
                    matchElementsWithCSV(csvData, newElements);
                }
            }
        });
    });

    // Start observing the document body for changes in child nodes and subtree
    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
}



const csvUrl = 'data/companies.csv';

loadCSV(csvUrl).then(csvData => {
    console.log("CSV Data Loaded:", csvData);
    const xpath = "//*[contains(@class, 'subtitle')]";
    const nodesSnapshot = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        const initialElements = [];
        for (let i = 0; i < nodesSnapshot.snapshotLength; i++) {
            initialElements.push(nodesSnapshot.snapshotItem(i));
        }

        matchElementsWithCSV(csvData, initialElements);

        // Observe for new elements dynamically added to the page
        observeNewElements(csvData);
    })
    .catch(error => {
        console.error("Error loading CSV:", error);
});
