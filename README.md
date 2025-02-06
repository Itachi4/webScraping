# Zillow Web Scraper API  

A **Node.js** and **Puppeteer**-based web scraper that fetches real estate listings from **Zillow** while navigating through search results.

## Features  

- Scrapes **Zillow** listings dynamically based on a **city** and **search query**  
- Uses **Puppeteer** to interact with the browser  
- Implements **auto-scrolling** to load more listings  
- Supports **pagination** to navigate multiple pages  
- Extracts **property price, address, number of beds/baths, and listing URLs**  

---

## Why Not Google?  

Initially, **Google Search** was considered for retrieving Zillow links. However, **Google has extremely strict anti-web crawling measures**, making it difficult to scrape search results without frequent **captchas and IP blocks**.  
To avoid this, I switched to **Bing Search**, which has fewer restrictions and allows easier extraction of Zillow links.

---

## Challenges Faced  

- **Auto-Scrolling:** Implemented an auto-scroll function to ensure all listings load before extraction.  
- **Pagination:** Added pagination support to navigate multiple Zillow pages.  
- **Captcha on Next Page:** Zillow triggers a **"Press & Hold to confirm you are human"** verification after visiting the second page, which **I cannot bypass without a paid captcha-solving service**.  
  - Because of this, the scraper can only extract **listings from the first page** successfully.  

---

## Prerequisites  

Ensure you have the following installed:  

- [Node.js](https://nodejs.org/) (v16+ recommended)  
- [npm](https://www.npmjs.com/) (comes with Node.js)  
- [Git](https://git-scm.com/) (for cloning the repository)  
- [Postman](https://www.postman.com/) (for API testing)  

---

## Installation & Setup  

### Clone the Repository  
```sh
git clone https://github.com/Itachi4/webScraping

### Install dependencies

npm install

### Run the scraper
npx ts-node src/app.ts
```

### Using the API with Postman
1)Open Postman
2) Make a POST request to

```
http://localhost:3000/scrape
```

Set the request body as JSON
```
{
  "query": "top home listings",
  "city": "New York"
}
```
Epected JSON response:
```
{
  "searchQuery": "top home listings",
  "city": "New York",
  "listings": [
    {
      "price": "$500,000",
      "address": "123 Main St, New York, NY",
      "beds": "2",
      "baths": "1",
      "link": "https://www.zillow.com/homedetails/..."
    }
  ]
}
```
#### Limitations
Pagination is implemented, but Zillow blocks bot navigation to the second page with a captcha
Captcha-solving services (e.g., 2Captcha, Anti-Captcha) are required to bypass this
Scraper currently works only for the first page of listings


