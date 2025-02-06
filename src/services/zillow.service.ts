import { Page } from "puppeteer";
import { Listing } from "../interfaces/listings.interface";
import { autoScroll, delay } from "./puppeteer.service";

/**
 * Searches for Zillow links using Bing and retrieves the first result.
 * @param {Page} page - The Puppeteer page.
 * @param {string} query - The search query.
 * @returns {Promise<string | null>} The Zillow URL if found, otherwise null.
 */
export async function getZillowURL(page: Page, query: string): Promise<string | null> {
    console.log("Navigating to Bing...");
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
 * Extracts listings from multiple pages of Zillow.
 * @param {Page} page - The Puppeteer page instance.
 * @param {string} baseUrl - The base Zillow URL without page numbers.
 * @returns {Promise<Listing[]>} A list of extracted listings.
 */
export async function scrapeZillowListings(page: Page, baseUrl: string): Promise<Listing[]> {
    console.log("Starting Zillow listing extraction...");

    let allListings: Listing[] = [];
    let pageCounter = 1;
    const maxPages = 4; // Limit to 4 pages

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

        allListings.push(...listings);

        pageCounter++;
        const nextPageUrl = `${baseUrl}${pageCounter}_p/`;
        console.log(`Navigating to next page: ${nextPageUrl}`);

        await page.goto(nextPageUrl, { waitUntil: "domcontentloaded" });
    }

    console.log("Finished extracting listings.");
    return allListings;
}
