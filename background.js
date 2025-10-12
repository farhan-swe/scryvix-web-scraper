


let currentScrapedData = [];



/**
 * Converts a string to a Base64 encoded string, safe for UTF-8 characters.
 * @param {string} str - The string to encode.
 * @returns {string} The Base64 encoded string.
 */
function base64Encode(str) {


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



/**
 * Converts a JavaScript array of objects into a CSV string.
 * @param {Array<Object>} data - The data array.
 * @returns {string} The CSV content string.
 */
function convertToCSV(data) {
    if (data.length === 0) return '';


    const headers = Object.keys(data[0]);
    let csv = headers.map(header => `"${header}"`).join(',') + '\r\n';


    data.forEach(item => {
        const row = headers.map(header => {
            let value = item[header] || '';

            value = String(value).replace(/\"/g, '\"\"');

            return `"${value}"`;
        }).join(',');
        csv += row + '\r\n';
    });

    return csv;
}




/**
 * Listener for messages from popup.js and contentScript.js
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {


    if (request.action === 'data_collected') {

        const dataWithTabId = request.data.map(record => ({ ...record, tabId: sender.tab ? sender.tab.id : 'unknown' }));
        const tabId = sender.tab ? sender.tab.id : 'unknown';
        currentScrapedData = currentScrapedData.filter(record => record.tabId !== tabId);
        currentScrapedData = [...currentScrapedData, ...dataWithTabId];


        chrome.runtime.sendMessage({
            action: 'data_update',
            data: currentScrapedData
        });


        chrome.storage.local.set({ lastScrapedData: currentScrapedData });

        sendResponse({ status: 'Data appended and forwarded' });
    } else if (request.action === 'data_update_preview') {

        const dataWithTabId = request.data.map(record => ({ ...record, tabId: sender.tab ? sender.tab.id : 'unknown' }));
        const tabId = sender.tab ? sender.tab.id : 'unknown';
        currentScrapedData = currentScrapedData.filter(record => record.tabId !== tabId);
        currentScrapedData = [...currentScrapedData, ...dataWithTabId];


        chrome.storage.local.set({ lastScrapedData: currentScrapedData });

        sendResponse({ status: 'Preview data saved' });
    }


    else if (request.action === 'get_scraped_data') {
        if (currentScrapedData.length > 0) {
            sendResponse({ data: currentScrapedData });
        } else {
            chrome.storage.local.get('lastScrapedData', (data) => {
                currentScrapedData = data.lastScrapedData || [];
                sendResponse({ data: currentScrapedData });
            });

            return true;
        }
    }


    else if (request.action === 'data_manipulation') {
        currentScrapedData = request.data;

        chrome.storage.local.set({ lastScrapedData: currentScrapedData });

        chrome.runtime.sendMessage({
            action: 'data_update',
            data: currentScrapedData
        });
        sendResponse({ status: 'Data manipulated and saved' });
    }


    else if (request.action === 'download_data') {
        const type = request.type;
        const data = request.data;
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `scryvix_data_${timestamp}.${type}`;
        let content;
        let mimeType;

        if (type === 'csv') {
            content = convertToCSV(data);
            mimeType = 'text/csv';
        } else if (type === 'json') {

            content = JSON.stringify(data, null, 4);
            mimeType = 'application/json';
        }



        const dataUri = createDataUri(content, mimeType);

        chrome.downloads.download({
            url: dataUri,
            filename: filename,
            saveAs: true
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error('Download failed:', chrome.runtime.lastError.message);
                sendResponse({ status: 'error', message: chrome.runtime.lastError.message });
            } else {
                console.log('Download started with ID:', downloadId);
                sendResponse({ status: 'success', downloadId: downloadId });
            }
        });


        return true;
    }


    return false;
});



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


chrome.runtime.onInstalled.addListener(() => {

    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "scryvixScrape",
            title: "Scryvix: Quick Scrape Element",
            contexts: ["all"]
        });
    });

    console.log('Scryvix extension installed/updated');
});


chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "scryvixScrape" && tab.id) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {

                if (typeof window.scryvixContextMenuStart === 'function') {
                    window.scryvixContextMenuStart();
                } else {
                    console.error("Content script not ready or scryvixContextMenuStart function missing.");
                }
            }
        });
    }
});