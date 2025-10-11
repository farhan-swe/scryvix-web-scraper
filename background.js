// background.js - Scryvix Service Worker with Fixed Download

// Global storage for the currently scraped data session
let currentScrapedData = [];

// --- Utility Functions for Data URI Creation (NEW FIX) ---

/**
 * Converts a string to a Base64 encoded string, safe for UTF-8 characters.
 * @param {string} str - The string to encode.
 * @returns {string} The Base64 encoded string.
 */
function base64Encode(str) {
    // This pattern safely encodes UTF-8 characters before converting to Base64
    // This is necessary because btoa only supports ASCII/Latin1
    return btoa(unescape(encodeURIComponent(str)));
}

/**
 * Creates a Base64 encoded Data URI for chrome.downloads.download.
 * @param {string} content - The file content (CSV or JSON string).
 * @param {string} mimeType - The MIME type of the file.
 * @returns {string} The Base64 Data URI.
 */
function createDataUri(content, mimeType) {
    const base64Content = base64Encode(content);
    return `data:${mimeType};base64,${base64Content}`;
}

// --- Data Utility Functions ---

/**
 * Converts a JavaScript array of objects into a CSV string.
 * @param {Array<Object>} data - The data array.
 * @returns {string} The CSV content string.
 */
function convertToCSV(data) {
    if (data.length === 0) return '';
    
    // Get headers (column names)
    const headers = Object.keys(data[0]);
    let csv = headers.map(header => `"${header}"`).join(',') + '\r\n'; // Header row
    
    // Data rows
    data.forEach(item => {
        const row = headers.map(header => {
            let value = item[header] || '';
            // Handle quotes within the data: double them up
            value = String(value).replace(/\"/g, '\"\"');
            // Wrap the value in double quotes
            return `"${value}"`;
        }).join(',');
        csv += row + '\r\n';
    });
    
    return csv;
}


// --- Message Listeners ---

/**
 * Listener for messages from popup.js and contentScript.js
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    // --- Data Update Handling (from contentScript) ---
    if (request.action === 'data_collected') {
        // Append the data with tab ID, replacing any previous from the same tab
        const dataWithTabId = request.data.map(record => ({ ...record, tabId: sender.tab ? sender.tab.id : 'unknown' }));
        const tabId = sender.tab ? sender.tab.id : 'unknown';
        currentScrapedData = currentScrapedData.filter(record => record.tabId !== tabId);
        currentScrapedData = [...currentScrapedData, ...dataWithTabId];

        // Send updated data to the popup
        chrome.runtime.sendMessage({
            action: 'data_update',
            data: currentScrapedData
        });

        // Save to chrome.storage.local for persistence
        chrome.storage.local.set({ lastScrapedData: currentScrapedData });

        sendResponse({ status: 'Data appended and forwarded' });
    } else if (request.action === 'data_update_preview') {
        // Save preview data with tab ID for live persistence
        const dataWithTabId = request.data.map(record => ({ ...record, tabId: sender.tab ? sender.tab.id : 'unknown' }));
        const tabId = sender.tab ? sender.tab.id : 'unknown';
        currentScrapedData = currentScrapedData.filter(record => record.tabId !== tabId);
        currentScrapedData = [...currentScrapedData, ...dataWithTabId];

        // Save to chrome.storage.local for persistence
        chrome.storage.local.set({ lastScrapedData: currentScrapedData });

        sendResponse({ status: 'Preview data saved' });
    }
    
    // --- Data Request from Popup (on startup) ---
    else if (request.action === 'get_scraped_data') {
        if (currentScrapedData.length > 0) {
            sendResponse({ data: currentScrapedData });
        } else {
            chrome.storage.local.get('lastScrapedData', (data) => {
                currentScrapedData = data.lastScrapedData || [];
                sendResponse({ data: currentScrapedData });
            });
            // Return true to indicate that sendResponse will be called asynchronously
            return true;
        }
    } 
    
    // --- Data Manipulation (from popup) ---
    else if (request.action === 'data_manipulation') {
        currentScrapedData = request.data;
        // Save the manipulated data
        chrome.storage.local.set({ lastScrapedData: currentScrapedData });
        // Send updated data back to the popup for UI refresh
        chrome.runtime.sendMessage({
            action: 'data_update',
            data: currentScrapedData
        });
        sendResponse({ status: 'Data manipulated and saved' });
    }
    
    // --- Download Handling (from popup.js) - FIXED LOGIC ---
    else if (request.action === 'download_data') {
        const type = request.type; // 'csv' or 'json'
        const data = request.data;
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `scryvix_data_${timestamp}.${type}`;
        let content;
        let mimeType;
        
        if (type === 'csv') {
            content = convertToCSV(data);
            mimeType = 'text/csv';
        } else if (type === 'json') {
            // Use 4 space indentation for readable JSON
            content = JSON.stringify(data, null, 4);
            mimeType = 'application/json';
        }

        // FIX: Use the new utility function to create a Base64 encoded Data URI
        // This is the most reliable way to download content in a Manifest V3 Service Worker
        const dataUri = createDataUri(content, mimeType);

        chrome.downloads.download({
            url: dataUri,
            filename: filename,
            saveAs: true // Ask the user where to save the file
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error('Download failed:', chrome.runtime.lastError.message);
                sendResponse({ status: 'error', message: chrome.runtime.lastError.message });
            } else {
                console.log('Download started with ID:', downloadId);
                sendResponse({ status: 'success', downloadId: downloadId });
            }
        });
        
        // IMPORTANT: Must return true for sendResponse to work asynchronously
        return true; 
    } 

    // Return false for synchronous response (or if you handle it explicitly in an else block)
    return false;
});


// --- Download Event Listeners ---
chrome.downloads.onCreated.addListener((downloadItem) => {
    console.log('Download created:', downloadItem.id, downloadItem.filename);
});

chrome.downloads.onChanged.addListener((delta) => {
    if (delta.state && delta.state.current === 'complete') {
        console.log('Download completed:', delta.id);
    } else if (delta.state && delta.state.current === 'interrupted') {
        console.error('Download interrupted:', delta.id);
    }
});

// --- Context Menu Integration ---
chrome.runtime.onInstalled.addListener(() => {
    // Clear existing context menus to avoid duplicates
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "scryvixScrape",
            title: "Scryvix: Quick Scrape Element",
            contexts: ["all"]
        });
    });
    
    console.log('Scryvix extension installed/updated');
});

// Context Menu logic for quick scraping
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "scryvixScrape" && tab.id) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                // Check if contentScript is loaded and has the required function
                if (typeof window.scryvixContextMenuStart === 'function') {
                    window.scryvixContextMenuStart();
                } else {
                    console.error("Content script not ready or scryvixContextMenuStart function missing.");
                }
            }
        });
    }
});