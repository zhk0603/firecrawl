import { Job, Queue } from "bullmq";
import { getDatasetQueue, getScrapeQueue } from "./queue-service";
import { v4 as uuidv4 } from "uuid";
import { WebScraperOptions } from "../types";
import * as Sentry from "@sentry/node";

async function addScrapeJobRaw(
  webScraperOptions: any,
  options: any,
  jobId: string,
): Promise<Job> {
  return await getScrapeQueue().add(jobId, webScraperOptions, {
    ...options,
    priority: webScraperOptions.crawl_id ? 20 : 10,
    jobId,
  });
}

export async function addScrapeJob(
  webScraperOptions: WebScraperOptions,
  options: any = {},
  jobId: string = uuidv4(),
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
      }, options, jobId);
    });
  } else {
    return await addScrapeJobRaw(webScraperOptions, options, jobId);
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

