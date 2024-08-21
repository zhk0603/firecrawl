import { Job, Queue } from "bullmq";
import { getDatasetQueue, getScrapeQueue } from "./queue-service";
import { v4 as uuidv4 } from "uuid";
import { WebScraperOptions } from "../types";

export async function addScrapeJob(
  webScraperOptions: WebScraperOptions,
  options: any = {},
  jobId: string = uuidv4(),
): Promise<Job> {
  return await getScrapeQueue().add(jobId, webScraperOptions, {
    priority: webScraperOptions.crawl_id ? 20 : 10,
    ...options,
    jobId,
  });
}

export async function addCrawlDataJob(crawl_id:any, doc:any, status: string, jobId:string = uuidv4()) {
  return await getDatasetQueue().add(
    jobId,
    {
      ...doc,
      jobId: crawl_id,
      status
    },
    {
      priority: 10,
      jobId: jobId,
    }
  );
}

export async function reportCrawlJobStatus(crawl_id:any, status: string, jobId:string = uuidv4()) {
  return await getDatasetQueue().add(
    jobId,
    {
      jobId: crawl_id,
      status
    },
    {
      priority: 20,
      jobId: jobId,
    }
  );
}

