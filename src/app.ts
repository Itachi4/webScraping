import express from "express";
import scraperRoutes from "./routes/scraper.routes";

const app = express();
app.use(express.json());
app.use(scraperRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
