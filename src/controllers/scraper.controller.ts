import { Request, Response } from "express";
import { launchBrowser } from "../services/puppeteer.service";
import { getZillowURL, scrapeZillowListings } from "../services/zillow.service";

export async function scrapeListings(req: Request, res: Response): Promise<void> {
    try {
        console.log("Received scrape request...");
        const { query, city } = req.body;

        if (!query || !city) {
            res.status(400).json({ error: 'Please provide both "query" and "city".' });
            return;
        }

        console.log("Launching Puppeteer...");
        const browser = await launchBrowser();
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(60000);

        const zillowUrl = await getZillowURL(page, `${query} ${city}`);
        if (!zillowUrl) throw new Error("No Zillow link found.");
        console.log("Found Zillow URL:", zillowUrl);

        await page.goto(zillowUrl, { waitUntil: "domcontentloaded" });

        const listings = await scrapeZillowListings(page, zillowUrl);

        await browser.close();
        res.json({ searchQuery: query, city, listings });
    } catch (error: any) {
        console.error("Scraping error:", error);
        res.status(500).json({ error: error.toString() });
    }
}
