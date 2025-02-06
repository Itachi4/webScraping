import { Router } from "express";
import { scrapeListings } from "../controllers/scraper.controller";

const router = Router();
router.post("/scrape", scrapeListings);

export default router;
