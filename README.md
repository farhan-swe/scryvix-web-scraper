# Scryvix: Precision Web Harvesting, Elevated.

<p align="center">
  <a href="https://github.com/khdxsohee/scryvix-web-scraper/stargazers"><img src="https://img.shields.io/github/stars/khdxsohee/scryvix-web-scraper?style=flat-square&color=FFD700&label=Stars" alt="GitHub Stars"></a>
  <a href="https://github.com/khdxsohee/scryvix-web-scraper/issues"><img src="https://img.shields.io/github/issues/khdxsohee/scryvix-web-scraper?style=flat-square&color=00B6D4" alt="GitHub Issues"></a>
  <img src="https://img.shields.io/badge/Status-Shipped-brightgreen?style=flat-square&color=34D399" alt="Status: Shipped">
  <img src="https://img.shields.io/badge/Architecture-Manifest%20V3-blueviolet?style=flat-square" alt="Architecture: Manifest V3">
  <img src="https://img.shields.io/badge/Language-Pure%20JavaScript-yellow?style=flat-square&color=FBBF24" alt="Language: Pure JavaScript">
</p>

> **Scryvix:** Where every scrape is an act of digital craftsmanship. A modern, lightning-fast extension built to bring elegance and power to your data extraction workflow. Harvest the web's knowledge with surgical precision and **zero-code setup.**

## 💡 The Scryvix Vision

In the realm of data, precision is paramount. Scryvix offers a refined, intuitive alternative to complex scraping tools. It's built on a reliable Manifest V3 architecture and designed with a sleek, low-light aesthetic to minimize eye strain and maximize focus—achieving the perfect balance of form and function.

### 🌟 Features: The Professional Toolkit

Scryvix delivers a comprehensive, **no-code** solution for structured data extraction, wrapped in a **Sleek Dark Theme** inspired by modern aesthetics.

| Feature Category | Core Feature | Description | Reference File(s) |
| :--- | :--- | :--- | :--- |
| **Surgical Selection** | Template-Driven Scraping | Define a template element and its constituent fields once; Scryvix captures all matching records with high accuracy. | `contentScript.js` |
| | Aggressive Selector Stability | Utilizes advanced CSS selector generation logic that *aggressively avoids unstable path identifiers* (like `nth-child`) to minimize breakage on dynamic sites. | `contentScript.js` |
| | Live Preview & Feedback | Instant, real-time data count and content preview within the popup, allowing for immediate selection validation. | `popup.js`, `contentScript.js` |
| **Data Refinement** | On-the-Fly Manipulation | Essential data cleaning tools in the popup: **Trim Spaces**, **Remove Duplicates**, and **Case Conversion** (Upper, Lower, Title). | `popup.js` |
| | Pagination & View Control | Effortlessly navigate large datasets with adjustable **Records Per Page** (10, 25, 50, 100) and clear, paginated data tables. | `popup.js`, `popup.html` |
| **Persistence & Export** | Session Data Persistence | Scraped data is automatically saved across browser sessions using `chrome.storage.local`. | `background.js` |
| | Robust Export Engine | Export structured data instantly to **CSV** or **JSON**, or simply **Copy to Clipboard**. Utilizes a reliable Data URI-based download fix in the Service Worker. | `background.js`, `popup.js` |
| **UX & Architecture** | Sleek Dark Theme | A professional, low-light UI with a vibrant Teal accent for superior ergonomics. Includes a **Light Mode Override** toggle. | `popup.css`, `popup.html` |
| | Context Menu Quick Start | Instantly initiate the element selector via a right-click context menu item. | `background.js` |

### 📸 Screenshots
<img width="418" height="481" alt="Capture" src="https://github.com/user-attachments/assets/d3d184f5-f62d-4bfe-9f7a-783ddf0da3b6" />

### 🛠️ Installation

1. **Clone the Repository:**
   ```bash
   git clone [https://github.com/khdxsohee/scryvix-web-scraper.git](https://github.com/khdxsohee/scryvix-web-scraper.git)
   ```

2.    Open Chrome Extensions Page:
Navigate to chrome://extensions/.

3. Enable Developer Mode:
Toggle the switch in the top right.

4. Load Unpacked:
Click "Load unpacked" and select the cloned scryvix-web-scraper directory.

### 📝 Usage Guide
1. Open the target webpage.

2. Click the Scryvix icon (or use the right-click context menu) to open the popup.

3. Click Start Scraping (Primary Button). The page cursor will change to a crosshair.

4. Click an element on the page (e.g., a product title) and define a Field Name when prompted. This element becomes your first Field.

5. Click different fields within the same record block (e.g., the URL, description, or author name) and name them.

6. Stop Scraping: When all fields are defined, click Stop Scraping. The data will be displayed in the table.

7. Refine & Export: Use the Data Management buttons to clean the data, and the Export buttons to download or copy your harvest.

My apologies for the misunderstanding. I will provide only the author information, formatted in Markdown, as requested.

---

### 👤 Author

**Developed by:** khdxsohee
**GitHub:** [khdxsohee](https://github.com/khdxsohee)
