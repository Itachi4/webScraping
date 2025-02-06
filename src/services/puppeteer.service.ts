import puppeteer, { Browser, Page } from "puppeteer";

/**
 * Launches a Puppeteer browser instance.
 * @returns {Promise<Browser>} The browser instance.
 */
export async function launchBrowser(): Promise<Browser> {
    return await puppeteer.launch({
        headless: false,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
}

/**
 * Delays execution for a specified time.
 * @param {number} ms - Milliseconds to wait.
 * @returns {Promise<void>} A promise that resolves after the delay.
 */
export const delay = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Scrolls the page to load more listings.
 * @param {Page} page - The Puppeteer page instance.
 * @returns {Promise<void>} A promise that resolves after scrolling.
 */
export async function autoScroll(page: Page): Promise<void> {
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
