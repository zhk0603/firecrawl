import { Queue, QueueEvents } from "bullmq";
import { Logger } from "../lib/logger";
import IORedis from "ioredis";

let scrapeQueue: Queue;
let datasetQueue: Queue;

export const redisConnection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const scrapeQueueName = "{scrapeQueue}";

export function getScrapeQueue() {
  if (!scrapeQueue) {
    scrapeQueue = new Queue(
      scrapeQueueName,
      {
        connection: redisConnection,
      }
      //   {
      //   settings: {
      //     lockDuration: 1 * 60 * 1000, // 1 minute in milliseconds,
      //     lockRenewTime: 15 * 1000, // 15 seconds in milliseconds
      //     stalledInterval: 30 * 1000,
      //     maxStalledCount: 10,
      //   },
      //   defaultJobOptions:{
      //     attempts: 5
      //   }
      // }
    );
    Logger.info("Web scraper queue created");
  }
  return scrapeQueue;
}

export function getDatasetQueue() {
  if (!datasetQueue) {
    datasetQueue = new Queue("web-datasets",
      {
        connection: redisConnection,
      }, 
      {
      settings: {
        lockDuration: 1 * 60 * 1000, // 1 minute in milliseconds,
        lockRenewTime: 15 * 1000, // 15 seconds in milliseconds
        stalledInterval: 30 * 1000,
        maxStalledCount: 10,
      },
      defaultJobOptions: {
        attempts: 5,
      },
    });
    Logger.info("Datasets queue created");
  }
  return datasetQueue;
}

export const scrapeQueueEvents = new QueueEvents(scrapeQueueName, { connection: redisConnection });