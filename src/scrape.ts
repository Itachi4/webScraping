import express, { Request, Response, Application } from "express";
import puppeteer, { Browser, Page } from "puppeteer";

const app: Application = express();
app.use(express.json());

/**
 * Interface.
 */
interface Listing {
    price: string | null;
    address: string | null;
    link: string | null;
    beds?: string | null;
    baths?: string | null;
}

/**
 * Delays execution for a specified number of milliseconds.
 * @param {number} second - The number of milliseconds to wait.
 * @returns {Promise<void>} A promise that resolves after the delay.
 */
const delay = (second: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, second));

/**
 * Scrolling.
 * @param {Page} page - The Puppeteer page instance.
 * @returns {Promise<void>} A promise that resolves after scrolling.
 */
async function autoScroll(page: Page): Promise<void> {
    await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= document.body.scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 300);
        });
    });
}

/**
 * Searches for Zillow links using Bing and retrieves the first result.
 * @param {Page} page - The Puppeteer page .
 * @param {string} query - The search query .
 * @returns {Promise<string | null>} The Zillow URL if found, otherwise null.
 */
async function getZillowURL(page: Page, query: string): Promise<string | null> {
    console.log("Navigating");
    await page.goto("https://www.bing.com/", { waitUntil: "domcontentloaded" });

    await delay(3000);
    await page.waitForSelector('textarea[name="q"], input[name="q"]', { timeout: 15000 });

    const searchBox = (await page.$('textarea[name="q"]')) || (await page.$('input[name="q"]'));
    if (!searchBox) throw new Error("Search box not found.");

    console.log(`Searching for: ${query}`);
    await searchBox.type(query, { delay: 100 });
    await page.keyboard.press("Enter");
    await page.waitForNavigation({ waitUntil: "domcontentloaded" });

    console.log("Extracting Zillow link...");
    const zillowUrl = await page.evaluate(() => {
        const searchResults = Array.from(document.querySelectorAll("h2 > a"));
        const zillowResult = searchResults.find((el) => el.textContent?.includes("Zillow"));
        return zillowResult ? zillowResult.getAttribute("href") : null;
    });

    return zillowUrl;
}

/**
 * Extracts real estate listings from a Zillow page.
 * @param {Page} page - The Puppeteer page instance.
 * @returns {Promise<Listing[]>} A list of extracted listings.
 */
async function scrapeZillowListings(page: Page): Promise<Listing[]> {
    console.log("Scrolling to load more listings...");
    await autoScroll(page);

    console.log("Extracting property listings...");
    return await page.evaluate(() => {
        const results: Listing[] = [];
        const baseUrl = window.location.origin;
        const cards = document.querySelectorAll('div[class*="StyledPropertyCardDataWrapper"]');

        cards.forEach((card) => {
            const price = card.querySelector('span[data-test="property-card-price"]')?.textContent?.trim() || null;
            const address = card.querySelector('address[data-test="property-card-addr"]')?.textContent?.trim() || null;
            let link = card.querySelector('a[data-test="property-card-link"]')?.getAttribute("href");
            link = link ? new URL(link, baseUrl).href : null;

            // Extract beds and baths
            const detailsList = card.querySelectorAll('ul[class*="StyledPropertyCardHomeDetailsList"] li');
            const beds = detailsList.length > 0 ? detailsList[0]?.textContent?.trim() || null : null;
            const baths = detailsList.length > 1 ? detailsList[1]?.textContent?.trim() || null : null;

            results.push({ price, address, link, beds, baths });
        });

        return results;
    });
}

/**
 * Express route for scraping Zillow listings.
 * Expects a POST request with query and city in JSON.
 */
app.post("/scrape", async (req: Request, res: Response): Promise<void> => {
    try {
        console.log("Received scrape request...");
        const { query, zill = " zillow ", city } = req.body;
        if (!query || !city) {
            res.status(400).json({ error: 'Please provide both "query" and "city".' });
            return;
        }

        console.log("Puppeteer Launch");
        const browser: Browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(60000);
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36");

        // Step 1: Get Zillow URL from Search
        const zillowUrl = await getZillowURL(page, `${query} ${city}`);
        if (!zillowUrl) throw new Error("No Zillow link found in search results.");
        console.log("Found Zillow URL:", zillowUrl);

        // Step 2: Navigate to Zillow and scrape listings
        console.log("Navigating to Zillow...");
        await page.goto(zillowUrl, { waitUntil: "domcontentloaded" });
        console.log("Final Zillow URL after navigation:", page.url());

        const listings = await scrapeZillowListings(page);

        console.log("Closing browser");
        await browser.close();

        console.log("Returning scraped data");
        res.json({ searchQuery: query, city, listings });
    } catch (error: any) {
        console.error("Scraping error:", error);
        res.status(500).json({ error: error.toString() });
    }
});

/**
 * Starts the Express server on the specified port.
 */
const PORT = process.env.PORT || 3000;
console.log("Starting server...");
app.listen(PORT, () => {
    console.log(`Scraper API is running on port ${PORT}`);
});
