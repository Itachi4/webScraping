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
 * Extracts real estate listings from multiple Zillow pages.
 * @param {Page} page - The Puppeteer page instance.
 * @returns {Promise<Listing[]>} A list of extracted listings.
 */
/**
 * Extracts real estate listings from multiple Zillow pages dynamically.
 * @param {Page} page - The Puppeteer page instance.
 * @param {string} baseUrl - The Zillow URL without page numbers (e.g., "/chicago-il/")
 * @returns {Promise<Listing[]>} A list of extracted listings.
 */
async function scrapeZillowListings(page: Page, baseUrl: string): Promise<Listing[]> {
    console.log("Starting property listing extraction...");

    let allListings: Listing[] = [];
    let pageCounter = 1; // Start from Page 1
    const maxPages = 4; // Limit pagination to 4 pages

    while (pageCounter <= maxPages) {
        console.log(`Scraping page ${pageCounter}...`);

        // Auto-scroll to load listings
        await autoScroll(page);

        let listings: Listing[] = await page.evaluate(() => {
            const results: Listing[] = [];
            const baseUrl = window.location.origin;
            const cards = document.querySelectorAll('div[class*="StyledPropertyCardDataWrapper"]');

            cards.forEach((card) => {
                const price = card.querySelector('span[data-test="property-card-price"]')?.textContent?.trim() || null;
                const address = card.querySelector('address[data-test="property-card-addr"]')?.textContent?.trim() || null;
                let link = card.querySelector('a[data-test="property-card-link"]')?.getAttribute("href");
                link = link ? new URL(link, baseUrl).href : null;
                results.push({ price, address, link });
            });

            return results;
        });

        if (listings.length === 0) {
            console.log("No more listings found, stopping pagination.");
            break;
        }

        allListings.push(...listings);

        // Construct the next page URL manually
        pageCounter++;
        const nextPageUrl = pageCounter === 2 ? `${baseUrl}${pageCounter}_p/` : `${baseUrl}${pageCounter}_p/`;
        console.log(`Navigating to next page: ${nextPageUrl}`);

        await page.goto(nextPageUrl, { waitUntil: "domcontentloaded" });
    }

    console.log("Finished extracting listings.");
    return allListings;
}


app.post("/scrape", async (req: Request, res: Response): Promise<void> => {
    try {
        console.log("Received scrape request...");
        const { query, city } = req.body;
        if (!query || !city) {
            res.status(400).json({ error: 'Please provide both "query" and "city".' });
            return;
        }

        console.log("Launching Puppeteer...");
        const browser: Browser = await puppeteer.launch({
            headless: false,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(60000);
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
        );

        const zillowUrl = await getZillowURL(page, `${query} ${city}`);
        if (!zillowUrl) throw new Error("No Zillow link found in search results.");
        console.log("Found Zillow URL:", zillowUrl);

        // Extract base URL (remove trailing "/")
        const baseUrl = zillowUrl.endsWith("/") ? zillowUrl : `${zillowUrl}/`;

        console.log("Navigating to Zillow...");
        await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

        const listings = await scrapeZillowListings(page, baseUrl);

        console.log("Closing browser...");
        await browser.close();

        console.log("Returning scraped data...");
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
