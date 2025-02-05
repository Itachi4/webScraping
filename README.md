Zillow Web Scraper API
A Node.js and Puppeteer-based web scraper that fetches real estate listings from Zillow by using search engine results as a workaround for bot detection.

Features
Scrapes Zillow listings based on a given city and search query.
Uses Puppeteer to interact with the browser dynamically.
Implements auto-scrolling to load more listings.
Handles bot detection by using search engine results.

**Prerequisites**

Ensure you have the following installed:

**Node.js (v16 or later)
npm (comes with Node.js)
Git (for cloning the repository)
Postman (for API testing)**

Installation & Setup

Clone the Repository

git clone https://github.com/Itachi4/webScraping.git

Install Dependencies
npm install

Run the API
npx ts-node src/scrape.ts

Using Postman for Scraping Listings
1. Open Postman
Ensure the API is running locally at http://localhost:3000
2. Make a POST Request
URL: http://localhost:3000/scrape
{
  "query": "top home listings",
  "city": "New York"
}

3. Expected Response

{
  "searchQuery": "Zillow homes",
  "city": "New York",
  "listings": [
    {
      "price": "$500,000",
      "address": "123 Main St, New York, NY",
      "link": "https://www.zillow.com/homedetails/..."
    }
  ]
}
