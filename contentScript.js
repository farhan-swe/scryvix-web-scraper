// contentScript.js - Scryvix Element Selector & Structured Scraping Logic with Live Updates

let isSelectorActive = false;
let currentFields = [];      
let templateElement = null;  

const COLOR_PALETTE = {
    highlight: '#818CF8', 
    btnSecondary: '#22C55E'
};

// --- CORE UTILITIES (Streamlined) ---

/**
 * Generates the Template Element Selector (Aggressive Up-leveling).
 */
function getUniqueCssSelector(el) {
    if (el.id) return `#${el.id}`;

    // Aggressive: Search for the highest parent with a semi-unique class
    let current = el;
    let path = [];
    
    // Go up and find the first DIV/SECTION with ID or container class
    while (current && current.tagName !== 'BODY' && current.tagName !== 'HTML' && path.length < 5) {
        let part = current.tagName.toLowerCase();
        
        // Important classes
        const usefulClasses = Array.from(current.classList).filter(c => 
            c && !c.startsWith('scryvix-') && c.length > 5 && !c.includes('-item') && !c.includes('active')
        );

        if (usefulClasses.length > 0) {
            // Include only the first important class
            part += `.${usefulClasses[0]}`;
        }
        
        path.unshift(part);
        
        if (current.id || usefulClasses.length > 2) {
            break; 
        }
        current = current.parentElement;
    }
    
    return path.join(' > ');
}

/**
 * FINAL AGGRESSIVE RELATIVE SELECTOR: Avoids nth-child completely.
 * Only uses Tag Name and the first unique Class (if available).
 */
function getRelativeSelector(el, base) {
    if (!base || el === base) return '';
    
    const path = [];
    let current = el;
    while (current && current !== base) {
        let selector = current.tagName.toLowerCase();
        
        if (current.id) {
            selector = `#${current.id}`;
        } else {
            // Aggressive: Only use the first good class.
            const usefulClasses = Array.from(current.classList).filter(c => 
                c && !c.startsWith('scryvix-') && c.length > 5
            );
            
            if (usefulClasses.length > 0) {
                selector += `.${usefulClasses[0]}`; 
            }
            // WARNING: Nth-child/Nth-of-type is COMPLETELY AVOIDED here to prevent path breakage.
        }

        path.unshift(selector);
        current = current.parentElement;
    }
    return path.join(' > ');
}

// --- LIVE SCRAPING FUNCTION ---
function startLiveScraping() {
    if (!templateElement || currentFields.length === 0) return;
    
    const scrapedData = runTemplatedScrape();
    
    // Send live update to background
    chrome.runtime.sendMessage({ 
        action: 'data_update_preview', 
        data: scrapedData 
    });
    
    // Update UI feedback
    const templateSelector = templateElement ? getUniqueCssSelector(templateElement) : null;
    if (templateSelector) {
        const count = document.querySelectorAll(templateSelector).length;
        chrome.runtime.sendMessage({ 
            action: 'selector_feedback', 
            message: `${currentFields.length} fields defined. Found ${scrapedData.length} records.`,
            count: scrapedData.length
        });
    }
}

// --- SELECTION & SCRAPING LOGIC ---

function selectElement(e) {
    if (!isSelectorActive) return;

    e.preventDefault();
    e.stopPropagation();

    const target = e.target;
    if (target.tagName === 'HTML' || target.tagName === 'BODY') return;
    
    const existingIndex = currentFields.findIndex(f => f.element === target);

    if (existingIndex !== -1) {
        // DESELECT logic
        target.classList.remove('scryvix-selected');
        currentFields.splice(existingIndex, 1);
        if (currentFields.length === 0) {
            document.querySelector('.scryvix-template')?.classList.remove('scryvix-template');
            templateElement = null;
        }
    } else {
        // --- SELECT ---
        target.classList.add('scryvix-selected');

        if (currentFields.length === 0) {
            // Set template to the selected element for single row scraping
            templateElement = target;
        }
        
        const fieldName = prompt(`Enter a name for this field:`, target.tagName.toLowerCase());
        if (!fieldName) {
            target.classList.remove('scryvix-selected');
            return;
        }
        
        document.querySelector('.scryvix-template')?.classList.remove('scryvix-template');
        templateElement.classList.add('scryvix-template');

        const fieldInfo = extractFieldInfo(target, fieldName);
        currentFields.push(fieldInfo);
    }
    
    target.classList.remove('scryvix-highlight');
    
    // LIVE UPDATE: Start scraping immediately after selection
    if (isSelectorActive && currentFields.length > 0) {
        startLiveScraping();
    }
}

function extractFieldInfo(target, fieldName) {
    const attributes = {};
    if (target.href) attributes.href = target.href;
    if (target.src) attributes.src = target.src;

    return {
        element: target,
        name: fieldName,
        relativeSelector: getUniqueCssSelector(target),
        value: target.textContent ? target.textContent.trim() : target.value || '',
        attributes: attributes
    };
}

/**
 * IMPROVED: Runs the scraping process with better value extraction
 */
function runTemplatedScrape() {
    if (currentFields.length === 0) {
        return []; 
    }
    
    let finalScrapedData = []; 

    const record = {};
    let recordValid = false;

    currentFields.forEach(field => {
        try {
            const fieldTarget = field.element;
            
            if (fieldTarget) {
                let scrapedValue = field.value;
                
                record[field.name] = scrapedValue || 'Empty';

                // Attributes
                if (field.attributes.href) record[`${field.name}_href`] = field.attributes.href;
                if (field.attributes.src) record[`${field.name}_src`] = field.attributes.src;
                
                // Mark record as valid if we got any data
                if (scrapedValue && scrapedValue !== 'Empty') {
                    recordValid = true;
                }
            } else {
                record[field.name] = 'Not Found';
            }
        } catch (e) {
            record[field.name] = 'ERROR';
            console.error('Error scraping field:', field.name, e);
        }
    });
    
    // Only push if we have at least one valid field
    if (recordValid || Object.keys(record).some(key => record[key] && record[key] !== 'Not Found' && record[key] !== 'Empty')) {
        // Add metadata
        record.id = finalScrapedData.length + 1;
        record.url = window.location.href;
        record.timestamp = new Date().toISOString();
        finalScrapedData.push(record);
    }

    return finalScrapedData;
}

// --- MAIN FLOW CONTROL ---

function stopSelector() {
    if (!isSelectorActive) return;
    isSelectorActive = false;
    document.body.classList.remove('scryvix-active');
    document.removeEventListener('mouseover', highlightElement, true);
    document.removeEventListener('mouseout', unhighlightElement, true);
    document.removeEventListener('click', selectElement, true);
    
    document.querySelectorAll('.scryvix-highlight, .scryvix-selected, .scryvix-template').forEach(el => {
        el.classList.remove('scryvix-highlight', 'scryvix-selected', 'scryvix-template');
    });
    
    const finalData = runTemplatedScrape();
    
    chrome.runtime.sendMessage({ action: 'data_collected', data: finalData });
    
    currentFields = [];
    templateElement = null;
    
    chrome.runtime.sendMessage({ action: 'selector_status', status: 'inactive' });
}

function startSelector() {
    if (isSelectorActive) return;
    isSelectorActive = true;
    document.body.classList.add('scryvix-active');
    document.addEventListener('mouseover', highlightElement, true);
    document.addEventListener('mouseout', unhighlightElement, true);
    document.addEventListener('click', selectElement, true);
    chrome.runtime.sendMessage({ action: 'selector_status', status: 'active' });
}

function resetSelection() {
    document.querySelectorAll('.scryvix-selected, .scryvix-template').forEach(el => {
        el.classList.remove('scryvix-selected', 'scryvix-template');
    });
    currentFields = [];
    templateElement = null;
}

function highlightElement(e) {
    if (!isSelectorActive || e.target.classList.contains('scryvix-selected')) return;
    document.querySelector('.scryvix-highlight')?.classList.remove('scryvix-highlight');
    e.target.classList.add('scryvix-highlight');
}

function unhighlightElement(e) {
    if (isSelectorActive && e.target.classList.contains('scryvix-highlight') && !e.target.classList.contains('scryvix-selected')) {
        e.target.classList.remove('scryvix-highlight');
    }
}

// --- MESSAGE LISTENERS & CSS INJECTION ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'start_selector') {
        startSelector();
    } else if (request.action === 'stop_selector') {
        stopSelector();
    } else if (request.action === 'reset_selection') { 
        resetSelection();
    } else if (request.action === 'check_selector_status') {
        chrome.runtime.sendMessage({ 
            action: 'selector_status', 
            status: isSelectorActive ? 'active' : 'inactive' 
        });
    }
    return true;
});

const style = document.createElement('style');
style.textContent = `
    body.scryvix-active { cursor: crosshair !important; }
    .scryvix-highlight {
        outline: 2px dashed ${COLOR_PALETTE.highlight} !important;
        background-color: ${COLOR_PALETTE.highlight}33 !important;
        cursor: crosshair !important;
    }
    .scryvix-selected {
        outline: 2px solid ${COLOR_PALETTE.btnSecondary} !important;
        background-color: ${COLOR_PALETTE.btnSecondary}33 !important;
        box-shadow: 0 0 5px ${COLOR_PALETTE.btnSecondary};
    }
    .scryvix-template { 
        border: 2px dashed #FFD700 !important; 
        box-shadow: 0 0 5px 3px #FFD70055 !important;
    }
`;
document.head.appendChild(style);