import { Job, Queue } from "bullmq";
import { getDatasetQueue, getScrapeQueue } from "./queue-service";
import { v4 as uuidv4 } from "uuid";
import { WebScraperOptions } from "../types";
import * as Sentry from "@sentry/node";

const defaultOptions = {
  removeOnComplete: {
    age: 24 * 3600,  // 24 hours in seconds
    count: 10000
  },
  removeOnFail: {
    age: 7 * 24 * 3600  // 7 days in seconds
  }
};

async function addScrapeJobRaw(
  webScraperOptions: any,
  options: any,
  jobId: string,
  jobPriority: number = 10
): Promise<Job> {
  return await getScrapeQueue().add(jobId, webScraperOptions, {
    ...defaultOptions,
    ...options,
    priority: jobPriority,
    jobId,
  });
}

export async function addScrapeJob(
  webScraperOptions: WebScraperOptions,
  options: any = {},
  jobId: string = uuidv4(),
  jobPriority: number = 10
): Promise<Job> {
  
  if (Sentry.isInitialized()) {
    const size = JSON.stringify(webScraperOptions).length;
    return await Sentry.startSpan({
      name: "Add scrape job",
      op: "queue.publish",
      attributes: {
        "messaging.message.id": jobId,
        "messaging.destination.name": getScrapeQueue().name,
        "messaging.message.body.size": size,
      },
    }, async (span) => {
      return await addScrapeJobRaw({
        ...webScraperOptions,
        sentry: {
          trace: Sentry.spanToTraceHeader(span),
          baggage: Sentry.spanToBaggageHeader(span),
          size,
        },
      }, options, jobId, jobPriority);
    });
  } else {
    return await addScrapeJobRaw(webScraperOptions, options, jobId, jobPriority);
  }
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
      ...defaultOptions
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
      ...defaultOptions
    }
  );
}

export function waitForJob(jobId: string, timeout: number) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const int = setInterval(async () => {
      if (Date.now() >= start + timeout) {
        clearInterval(int);
        reject(new Error("Job wait "));
      } else {
        const state = await getScrapeQueue().getJobState(jobId);
        if (state === "completed") {
          clearInterval(int);
          resolve((await getScrapeQueue().getJob(jobId)).returnvalue);
        } else if (state === "failed") {
          // console.log("failed", (await getScrapeQueue().getJob(jobId)).failedReason);
          clearInterval(int);
          reject((await getScrapeQueue().getJob(jobId)).failedReason);
        }
      }
    }, 1000);
  })
}
