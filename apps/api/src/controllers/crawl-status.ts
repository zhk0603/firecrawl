import { Request, Response } from "express";
import { authenticateUser } from "./auth";
import { RateLimiterMode } from "../../src/types";
import { getScrapeQueue } from "../../src/services/queue-service";
import { Logger } from "../../src/lib/logger";
import { getCrawl, getCrawlJobs } from "../../src/lib/crawl-redis";
import { supabaseGetJobsById } from "../../src/lib/supabase-jobs";

export async function getJobs(ids: string[]) {
  const jobs = (await Promise.all(ids.map(x => getScrapeQueue().getJob(x)))).filter(x => x);
  
  if (process.env.USE_DB_AUTHENTICATION === "true") {
    const supabaseData = await supabaseGetJobsById(ids);

    supabaseData.forEach(x => {
      const job = jobs.find(y => y.id === x.job_id);
      if (job) {
        job.returnvalue = x.docs;
      }
    })
  }

  jobs.forEach(job => {
    job.returnvalue = Array.isArray(job.returnvalue) ? job.returnvalue[0] : job.returnvalue;
  });

  return jobs;
}

export async function crawlStatusController(req: Request, res: Response) {
  try {
    const { success, team_id, error, status } = await authenticateUser(
      req,
      res,
      RateLimiterMode.CrawlStatus
    );
    if (!success) {
      return res.status(status).json({ error });
    }

    const sc = await getCrawl(req.params.jobId);
    if (!sc) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (sc.team_id !== team_id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const jobIDs = await getCrawlJobs(req.params.jobId);

    const jobs = (await getJobs(jobIDs)).sort((a, b) => a.timestamp - b.timestamp);
    const jobStatuses = await Promise.all(jobs.map(x => x.getState()));
    const jobStatus = sc.cancelled ? "failed" : jobStatuses.every(x => x === "completed") ? "completed" : jobStatuses.some(x => x === "failed") ? "failed" : "active";

    const data = jobs.map(x => Array.isArray(x.returnvalue) ? x.returnvalue[0] : x.returnvalue);

    res.json({
      status: jobStatus,
      current: jobStatuses.filter(x => x === "completed" || x === "failed").length,
      total: jobs.length,
      data: jobStatus === "completed" ? data : null,
      partial_data: jobStatus === "completed" ? [] : data.filter(x => x !== null),
    });
  } catch (error) {
    Logger.error(error);
    return res.status(500).json({ error: error.message });
  }
}
