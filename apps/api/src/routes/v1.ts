import express, { NextFunction, Request, Response } from "express";
import { crawlController } from "../controllers/v1/crawl";
// import { crawlStatusController } from "../../src/controllers/v1/crawl-status";
import { scrapeController } from "../../src/controllers/v1/scrape";
import { crawlStatusController } from "../controllers/v1/crawl-status";
import { mapController } from "../controllers/v1/map";
import { ErrorResponse, RequestWithAuth, RequestWithMaybeAuth } from "../controllers/v1/types";
import { RateLimiterMode } from "../types";
import { authenticateUser } from "../controllers/auth";
import { createIdempotencyKey } from "../services/idempotency/create";
import { validateIdempotencyKey } from "../services/idempotency/validate";
import { checkTeamCredits } from "../services/billing/credit_billing";
import expressWs from "express-ws";
import { crawlStatusWSController } from "../controllers/v1/crawl-status-ws";
import { isUrlBlocked } from "../scraper/WebScraper/utils/blocklist";
import { crawlCancelController } from "../controllers/v1/crawl-cancel";
import { Logger } from "../lib/logger";
import { scrapeStatusController } from "../controllers/v1/scrape-status";
// import { crawlPreviewController } from "../../src/controllers/v1/crawlPreview";
// import { crawlJobStatusPreviewController } from "../../src/controllers/v1/status";
// import { searchController } from "../../src/controllers/v1/search";
// import { crawlCancelController } from "../../src/controllers/v1/crawl-cancel";
// import { keyAuthController } from "../../src/controllers/v1/keyAuth";
// import { livenessController } from "../controllers/v1/liveness";
// import { readinessController } from "../controllers/v1/readiness";

function checkCreditsMiddleware(minimum?: number): (req: RequestWithAuth, res: Response, next: NextFunction) => void {
    return (req, res, next) => {
        (async () => {
            if (!minimum && req.body) {
                minimum = (req.body as any)?.limit ?? 1;
            }
            const { success, message, remainingCredits } = await checkTeamCredits(req.auth.team_id, minimum);
            if (!success) {
                Logger.error(`Insufficient credits: ${JSON.stringify({ team_id: req.auth.team_id, minimum, remainingCredits })}`);
                return res.status(402).json({ success: false, error: "Insufficient credits" });
            }
            req.account = { remainingCredits }
            next();
        })()
            .catch(err => next(err));
    };
}

export function authMiddleware(rateLimiterMode: RateLimiterMode): (req: RequestWithMaybeAuth, res: Response, next: NextFunction) => void {
    return (req, res, next) => {
        (async () => {
            const { success, team_id, error, status, plan } = await authenticateUser(
                req,
                res,
                rateLimiterMode,
            );

            if (!success) {
                return res.status(status).json({ success: false, error });
            }

            req.auth = { team_id, plan };
            next();
        })()
            .catch(err => next(err));
    }
}

function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
    (async () => {
        if (req.headers["x-idempotency-key"]) {
            const isIdempotencyValid = await validateIdempotencyKey(req);
            if (!isIdempotencyValid) {
                return res.status(409).json({ success: false, error: "Idempotency key already used" });
            }
            createIdempotencyKey(req);
        }
        next();
    })()
        .catch(err => next(err));
}

function blocklistMiddleware(req: Request, res: Response, next: NextFunction) {
    if (req.body.url && isUrlBlocked(req.body.url)) {
        return res.status(403).json({ success: false, error: "URL is blocked. Firecrawl currently does not support social media scraping due to policy restrictions." });
    }
    next();
}

function wrap(controller: (req: Request, res: Response) => Promise<any>): (req: Request, res: Response, next: NextFunction) => any {
    return (req, res, next) => {
        controller(req, res)
            .catch(err => next(err))
    }
}

expressWs(express());

export const v1Router = express.Router();

v1Router.post(
    "/scrape",
    blocklistMiddleware,
    authMiddleware(RateLimiterMode.Scrape),
    checkCreditsMiddleware(1),
    wrap(scrapeController)
);

v1Router.post(
    "/crawl",
    blocklistMiddleware,
    authMiddleware(RateLimiterMode.Crawl),
    idempotencyMiddleware,
    checkCreditsMiddleware(),
    wrap(crawlController)
);

v1Router.post(
    "/map",
    blocklistMiddleware,
    authMiddleware(RateLimiterMode.Map),
    checkCreditsMiddleware(1),
    wrap(mapController)
);

v1Router.get(
    "/crawl/:jobId",
    authMiddleware(RateLimiterMode.CrawlStatus),
    wrap(crawlStatusController)
);

v1Router.get(
    "/scrape/:jobId",
    wrap(scrapeStatusController)
);

v1Router.ws(
    "/crawl/:jobId",
    crawlStatusWSController
);

// v1Router.post("/crawlWebsitePreview", crawlPreviewController);


v1Router.delete(
  "/crawl/:jobId",
  authMiddleware(RateLimiterMode.Crawl),
  crawlCancelController
);
// v1Router.get("/checkJobStatus/:jobId", crawlJobStatusPreviewController);

// // Auth route for key based authentication
// v1Router.get("/keyAuth", keyAuthController);

// // Search routes
// v0Router.post("/search", searchController);

// Health/Probe routes
// v1Router.get("/health/liveness", livenessController);
// v1Router.get("/health/readiness", readinessController);
