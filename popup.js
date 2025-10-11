// popup.js - Scryvix Popup Logic with Pagination & Live Updates

// --- Cache DOM elements ---
const startScrapingBtn = document.getElementById('start-scraping-btn');
const stopScrapingBtn = document.getElementById('stop-scraping-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const exportJsonBtn = document.getElementById('export-json-btn');
const copyClipboardBtn = document.getElementById('copy-clipboard-btn');

const dataTableContainer = document.getElementById('data-table-container');
const tablePlaceholder = document.getElementById('table-placeholder');
const dataStats = document.getElementById('data-stats');
const settingsBtn = document.getElementById('settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const settingsModal = document.getElementById('settings-modal');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const notificationBar = document.getElementById('notification-bar');

// Data Management Buttons
const trimSpacesBtn = document.getElementById('trim-spaces-btn');
const removeDuplicatesBtn = document.getElementById('remove-duplicates-btn');
const caseConversionSelect = document.getElementById('case-conversion-select');
const clearDataBtn = document.getElementById('clear-data-btn');

// Pagination Elements
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');
const pageInfo = document.getElementById('page-info');
const pageSizeSelect = document.getElementById('page-size-select');

// --- Global State ---
let allScrapedData = [];
let currentPage = 1;
let recordsPerPage = parseInt(pageSizeSelect.value); // Initial value from HTML
let isSelectorActive = false; // Tracks content script's state


// --- Utility Functions ---

/**
 * Displays a temporary notification message.
 * @param {string} message - The message to display.
 * @param {('success'|'error'|'info')} type - The type of notification.
 */
function showNotification(message, type = 'info') {
    notificationBar.textContent = message;
    notificationBar.className = `notification-bar ${type}-notification`;
    notificationBar.classList.remove('hidden');
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        notificationBar.classList.add('hidden');
    }, 3000);
}

/**
 * Updates the state of all action buttons based on whether data exists.
 */
function updateButtonStates() {
    const hasData = allScrapedData.length > 0;
    
    // Primary Actions
    exportCsvBtn.disabled = !hasData;
    exportJsonBtn.disabled = !hasData;
    copyClipboardBtn.disabled = !hasData;
    clearDataBtn.disabled = !hasData;

    // Management Actions
    trimSpacesBtn.disabled = !hasData;
    removeDuplicatesBtn.disabled = !hasData;
    caseConversionSelect.disabled = !hasData;
}

/**
 * Updates the table, stats, and pagination controls.
 */
function updatePaginationUI() {
    const totalRecords = allScrapedData.length;
    
    // Update Stats
    dataStats.textContent = `Total records: ${totalRecords}`;

    if (totalRecords === 0) {
        // Show placeholder and disable everything
        tablePlaceholder.classList.remove('hidden');
        dataTableContainer.innerHTML = ''; // Clear table
        pageInfo.textContent = 'Page 0';
        prevPageBtn.disabled = true;
        nextPageBtn.disabled = true;
        updateButtonStates();
        return;
    }

    // Hide placeholder and enable buttons
    tablePlaceholder.classList.add('hidden');
    updateButtonStates();

    // Calculate pagination values
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, totalRecords);
    const paginatedData = allScrapedData.slice(startIndex, endIndex);

    // Update table with paginated data
    renderDataTable(paginatedData);

    // Update Pagination UI
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
}

/**
 * Renders the data array into the HTML table.
 * @param {Array<Object>} data - The data array (can be paginated).
 */
function renderDataTable(data) {
    if (data.length === 0) {
        dataTableContainer.innerHTML = '';
        return;
    }

    // Get headers from the first object
    const headers = Object.keys(data[0]);

    let html = '<table class="data-table"><thead><tr>';
    // Create Header Row
    headers.forEach(h => {
        // Simple sanitization: escape HTML tags
        const safeHeader = h.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        html += `<th>${safeHeader}</th>`;
    });
    html += '</tr></thead><tbody>';

    // Create Data Rows
    data.forEach(row => {
        html += '<tr>';
        headers.forEach(header => {
            // Get value, ensure it's a string, and escape HTML
            const value = String(row[header] || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            html += `<td>${value}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    dataTableContainer.innerHTML = html;
}

/**
 * Sends a message to the content script to toggle the selector.
 * @param {('start'|'stop')} action - The action to perform.
 */
function toggleSelector(action) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0].id;
        const messageAction = action === 'start' ? 'start_selector' : 'stop_selector';
        
        chrome.tabs.sendMessage(tabId, { action: messageAction }, (response) => {
            if (chrome.runtime.lastError) {
                // This happens if content script is not injected (e.g., on a Chrome internal page)
                showNotification('Error: Scrape only works on a regular webpage.', 'error');
                return;
            }
            
            isSelectorActive = action === 'start';
            updateScrapingUI(isSelectorActive);

            if (action === 'start') {
                showNotification('Scraping started. Click elements to define fields and template.', 'info');
            } else {
                showNotification('Scraping stopped. Data processing complete.', 'success');
            }
        });
    });
}

/**
 * Updates the UI state of the scraping buttons.
 * @param {boolean} active - True if the selector is active.
 */
function updateScrapingUI(active) {
    startScrapingBtn.disabled = active;
    stopScrapingBtn.disabled = !active;
    
    if (active) {
        startScrapingBtn.textContent = 'Selecting...';
        startScrapingBtn.classList.add('disabled-state');
    } else {
        startScrapingBtn.textContent = 'Start Scraping';
        startScrapingBtn.classList.remove('disabled-state');
    }
}

// --- Handlers for Data Management ---

function handleTrimSpaces() {
    if (allScrapedData.length === 0) return;

    const manipulatedData = allScrapedData.map(record => {
        const newRecord = {};
        for (const key in record) {
            newRecord[key] = typeof record[key] === 'string' ? record[key].trim() : record[key];
        }
        return newRecord;
    });

    sendDataManipulation(manipulatedData, 'Spaces trimmed');
}

function handleRemoveDuplicates() {
    if (allScrapedData.length === 0) return;

    // Use a Set to track seen records by their JSON string representation
    const uniqueRecords = [];
    const seen = new Set();
    let duplicatesRemoved = 0;

    allScrapedData.forEach(record => {
        const key = JSON.stringify(record);
        if (!seen.has(key)) {
            seen.add(key);
            uniqueRecords.push(record);
        } else {
            duplicatesRemoved++;
        }
    });

    sendDataManipulation(uniqueRecords, `${duplicatesRemoved} duplicates removed`);
}

function handleCaseConversion(conversionType) {
    if (allScrapedData.length === 0 || !conversionType) return;

    const convertString = (str) => {
        if (typeof str !== 'string') return str;
        switch (conversionType) {
            case 'upper': return str.toUpperCase();
            case 'lower': return str.toLowerCase();
            case 'title':
                return str.toLowerCase().split(' ').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');
            default: return str;
        }
    };

    const manipulatedData = allScrapedData.map(record => {
        const newRecord = {};
        for (const key in record) {
            newRecord[key] = convertString(record[key]);
        }
        return newRecord;
    });
    
    sendDataManipulation(manipulatedData, `Case converted to ${conversionType}`);
    // Reset select box after action
    caseConversionSelect.value = ''; 
}

function handleClearData() {
    if (allScrapedData.length === 0) return;

    const confirmation = confirm('Are you sure you want to clear all scraped data? This action cannot be undone.');
    if (confirmation) {
        // Send empty data array to background to clear storage
        sendDataManipulation([], 'All data cleared');
        currentPage = 1;
        updatePaginationUI();
        showNotification('Data has been cleared.', 'info');
    }
}

/**
 * Sends manipulated data to the background script for updating the global state and storage.
 * @param {Array<Object>} data - The new data array.
 * @param {string} notificationMsg - The message to show on success.
 */
function sendDataManipulation(data, notificationMsg) {
    chrome.runtime.sendMessage({
        action: 'data_manipulation',
        data: data
    }, (response) => {
        if (response && response.status === 'Data manipulated and saved') {
            allScrapedData = data;
            // Re-render table with new data
            updatePaginationUI(); 
            showNotification(notificationMsg, 'success');
        } else {
            showNotification('Error processing data management action.', 'error');
        }
    });
}


/**
 * Sends a download request to the background service worker.
 * @param {('csv'|'json'|'copy')} type - The export format.
 */
function handleExport(type) {
    if (allScrapedData.length === 0) {
        showNotification('No data to export.', 'info');
        return;
    }

    if (type === 'copy') {
        const jsonString = JSON.stringify(allScrapedData, null, 2);
        navigator.clipboard.writeText(jsonString).then(() => {
            showNotification('JSON data copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Copy failed:', err);
            showNotification('Failed to copy data to clipboard.', 'error');
        });
        return;
    }

    // --- FIX: Download logic for CSV/JSON (Sends request to background.js) ---
    showNotification(`Preparing ${type.toUpperCase()} file for download...`, 'info');

    chrome.runtime.sendMessage({
        action: 'download_data',
        type: type,
        data: allScrapedData
    }, (response) => {
        if (chrome.runtime.lastError) {
             console.error("Error communicating with background script:", chrome.runtime.lastError.message);
             showNotification('Download failed: Communication error.', 'error');
             return;
        }
        
        if (response.status === 'success') {
            // Notification for the download prompt being opened
            showNotification(`Download of ${type.toUpperCase()} file started!`, 'success');
        } else {
            console.error('Download failed:', response.message);
            showNotification(`Download failed: ${response.message}`, 'error');
        }
    });
}


// --- Initialization ---

/**
 * Initializes the popup by loading data and checking selector status.
 */
function initPopup() {
    // 1. Load Dark Mode Preference
    chrome.storage.local.get('darkMode', (data) => {
        const isDarkMode = data.darkMode !== false; // Default to true if not set
        darkModeToggle.checked = isDarkMode;
        document.body.classList.toggle('light-mode', !isDarkMode);
    });

    // 2. Request Scraped Data from Service Worker
    chrome.runtime.sendMessage({ action: 'get_scraped_data' }, (response) => {
        if (response && response.data) {
            allScrapedData = response.data;
            updatePaginationUI();
        } else {
            updatePaginationUI(); // Renders placeholder if no data
        }
    });

    // 3. Check Selector Status (to keep UI in sync)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'check_selector_status' });
        }
    });
}

// --- Listeners from Background/Content Script ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // New data collected or stored data update
    if (request.action === 'data_update') {
        allScrapedData = request.data;
        updatePaginationUI(); // Rerender table and stats
    }
    // Selector status update from content script
    else if (request.action === 'selector_status') {
        isSelectorActive = request.status === 'active';
        updateScrapingUI(isSelectorActive);
    }
    // Listen for data manipulation events (optional, handled by synchronous response)
});


// --- DOM Event Listeners ---

// Main Actions
startScrapingBtn.addEventListener('click', () => toggleSelector('start'));
stopScrapingBtn.addEventListener('click', () => toggleSelector('stop'));

// Export Actions
exportCsvBtn.addEventListener('click', () => handleExport('csv'));
exportJsonBtn.addEventListener('click', () => handleExport('json'));
copyClipboardBtn.addEventListener('click', () => handleExport('copy'));

// Data Management Listeners
trimSpacesBtn.addEventListener('click', handleTrimSpaces);
removeDuplicatesBtn.addEventListener('click', handleRemoveDuplicates);
caseConversionSelect.addEventListener('change', (e) => handleCaseConversion(e.target.value));
clearDataBtn.addEventListener('click', handleClearData);

// Pagination Listeners
prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        updatePaginationUI();
    }
});

nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(allScrapedData.length / recordsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        updatePaginationUI();
    }
});

pageSizeSelect.addEventListener('change', (e) => {
    recordsPerPage = parseInt(e.target.value);
    currentPage = 1;
    updatePaginationUI();
});

// Settings Listeners
settingsBtn.addEventListener('click', () => settingsModal.classList.add('visible'));
closeSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('visible'));
darkModeToggle.addEventListener('change', (e) => {
    const isDarkMode = e.target.checked;
    document.body.classList.toggle('light-mode', !isDarkMode);
    chrome.storage.local.set({ darkMode: isDarkMode });
});

// --- Start Popup ---
document.addEventListener('DOMContentLoaded', initPopup);