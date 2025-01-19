console.log("Content script is running.");

const job_title_class = '.full-width artdeco-entity-lockup__title ember-view';
const xpath = "//*[@class='artdeco-entity-lockup__subtitle ember-view']";
const processedJobs = new Set();

// Function to fetch and parse the CSV file
async function loadCSV() {
    const url = browser.runtime.getURL('data/company_ratings.csv'); // Construct the correct URL
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.text();
    const rows = data.split('\n').map(row => row.split(';'));
    return rows; // returns an array of arrays
}

// Function to switch page if no match was found
function goToNextPage() {
    const currentPageElement = document.querySelector('button[aria-current="true"]');
    console.log("Current page element:", currentPageElement);
    if (currentPageElement) {
        const currentPageLi = currentPageElement.closest('li');
        const nextPageLi = currentPageLi ? currentPageLi.nextElementSibling : null;
        if (nextPageLi) {
            const nextButton = nextPageLi.querySelector('button');
            if (nextButton) {
                console.log("Navigating to the next page...");
                nextButton.click();
            }
        }
    }
}

// Function to match elements with CSV data and remove first <li> parent if no match
function matchElementsWithCSV(csvData, elements) {
    console.log("Matching elements with CSV data:");
    console.log("Elements:", elements);
    elements.forEach(element => {
        // Check if the element has already been processed
        if (element.getAttribute('data-processed') === 'true') {
            console.log(`Element ${element.textContent.trim()} has already been processed, skipping.`);
            return; // Skip this element
        }
        console.log("Element:", element.textContent);
        const elementText = element.textContent.split('·')[0].trim();
        console.log(`Checking element:`, elementText);

        // Clear previous matches
        const existingDisplayElements = element.querySelectorAll('.csv-display');
        existingDisplayElements.forEach(display => display.remove());

        // Check if the element matches any company name from the csv

        const matchingRow = csvData.find(row => row[0].trim() === elementText);
        divParent = element.parentElement;
        console.log("divParent:", divParent.children);
        const jobIdentifier = divParent.children[0];
        if (matchingRow && parseFloat(matchingRow[1].trim()) > 4.0) {
            if (processedJobs.has(jobIdentifier)) {
                const liParent = element.closest('li');
                console.log(`Duplicate job found: ${jobIdentifier}. Removing element.`);
                if (liParent) {
                    liParent.remove();
                }
                return; // Exit early for duplicates
            } else {
                processedJobs.add(jobIdentifier);

                // Reset background color
                element.style.backgroundColor = '';

                // Find the matching row in the CSV
                const rating = parseFloat(matchingRow[1].trim()).toFixed(1);
                const reviews = parseInt(matchingRow[2].trim());
                const link = matchingRow[3].trim();

                console.log(`Match found: ${elementText} => ${rating}`);
                if (rating >= 4.5) {
                    element.style.backgroundColor = '#036D19'; // Highlight in green for values >= 4.5
                } else {
                    element.style.backgroundColor = '#330F0A'; // Highlight in red for other values
                }

                // Create a new element to display the rating and reviews
                const displayElement = document.createElement('div');
                displayElement.textContent = rating + " - " + reviews + " Reviews" + " - ";
                displayElement.className = "csv-display"; // Adding class for easier removal
                displayElement.style.color = "white";

                const linkText = document.createElement('a');
                linkText.href = link;
                linkText.target = "_blank"; // Open link in new tab
                linkText.style.textDecoration = "underline";
                linkText.textContent = "Job board";
                linkText.addEventListener('click', (event) => {
                    event.stopPropagation();
                });
                displayElement.appendChild(linkText); // Append the link to the display element
            element.appendChild(displayElement);
            }
        } else {
            // If the element does not match any first column value in the CSV, remove the first <li> parent
            console.log(`No match found for: ${elementText}. Removing closest <li> parent.`);
            fetch("http://localhost:8080", {
                method: "POST",
                mode:"no-cors",
                headers: {
                  "Content-Type": "text/plain",
                },
                body: elementText,
              })
                .then((response) => {
                  if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                  }
                  return response.text(); // Or response.json() if the proxy responds with JSON
                })
                .then((data) => {
                  console.log("Response from proxy:", data);
                })
                .catch((error) => {
                  console.error("Error sending data to the proxy:", error);
                });
            const liParent = element.closest('li');
            if (liParent) {
                liParent.remove();
                console.log('<li> element removed.');
            }
        }

        // Mark this element as processed
        element.setAttribute('data-processed', 'true');
    });
}

// Function to observe DOM mutations (new elements being added)
function observeNewElements(csvData) {
    const observer = new MutationObserver((mutationsList) => {
        mutationsList.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // Check if it's an element node
                    const nodesSnapshot = document.evaluate(xpath, node, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

                    const newElements = [];
                    for (let i = 0; i < nodesSnapshot.snapshotLength; i++) {
                        const element = nodesSnapshot.snapshotItem(i);
                        // Only process the element if it hasn't been processed yet
                        if (!element.getAttribute('data-processed')) {
                            newElements.push(element);
                        }
                    }

                    if (newElements.length > 0) {
                        console.log(`New elements found: ${newElements.length}`);
                        matchElementsWithCSV(csvData, newElements);
                    }
                }
            });
        });
    });

    // Start observing the document body for changes in child nodes and subtree
    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    return observer; // Return the observer in case you want to disconnect or reconnect it later
}

// Listen for the space bar key press to navigate to the next page
document.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
        console.log("Tab pressed. Checking for next page.");
        goToNextPage();
    }
});

// Load CSV and set up mutation observer to monitor new elements
loadCSV()
    .then(csvData => {
        console.log("CSV Data Loaded:", csvData);

        // Run the matching function immediately on existing elements
        const nodesSnapshot = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        const initialElements = [];
        for (let i = 0; i < nodesSnapshot.snapshotLength; i++) {
            const element = nodesSnapshot.snapshotItem(i);
            // Only process the element if it hasn't been processed yet
            if (!element.getAttribute('data-processed')) {
                initialElements.push(element);
            }
        }

        matchElementsWithCSV(csvData, initialElements);

        // Observe for new elements dynamically added to the page
        observeNewElements(csvData);
    })
    .catch(error => {
        console.error("Error loading CSV:", error);
    });
