import { redisConnection } from "../../src/services/queue-service";
import { PlanType } from "../../src/types";
import { Logger } from "./logger";

const SET_KEY_PREFIX = "limit_team_id:";
export async function addJobPriority(team_id, job_id) {
  try {
    const setKey = SET_KEY_PREFIX + team_id;

    // Add scrape job id to the set
    await redisConnection.sadd(setKey, job_id);

    // This approach will reset the expiration time to 60 seconds every time a new job is added to the set.
    await redisConnection.expire(setKey, 60);
  } catch (e) {
    Logger.error(`Add job priority (sadd) failed: ${team_id}, ${job_id}`);
  }
}

export async function deleteJobPriority(team_id, job_id) {
  try {
    const setKey = SET_KEY_PREFIX + team_id;

    // remove job_id from the set
    await redisConnection.srem(setKey, job_id);
  } catch (e) {
    Logger.error(`Delete job priority (srem) failed: ${team_id}, ${job_id}`);
  }
}

export async function getJobPriority({
  plan,
  team_id,
  basePriority = 10,
}: {
  plan: PlanType;
  team_id: string;
  basePriority?: number;
}): Promise<number> {
  try {
    const setKey = SET_KEY_PREFIX + team_id;

    // Get the length of the set
    const setLength = await redisConnection.scard(setKey);

    // Determine the priority based on the plan and set length
    let planModifier = 1;
    let bucketLimit = 0;

    switch (plan) {
      case "free":
        bucketLimit = 25;
        planModifier = 0.5;
        break;
      case "hobby":
        bucketLimit = 100;
        planModifier = 0.3;
        break;
      case "standard":
      case "standardnew":
        bucketLimit = 200;
        planModifier = 0.2;
        break;
      case "growth":
      case "growthdouble":
        bucketLimit = 400;
        planModifier = 0.1;
        break;

      default:
        bucketLimit = 25;
        planModifier = 1;
        break;
    }

    // if length set is smaller than set, just return base priority
    if (setLength <= bucketLimit) {
      return basePriority;
    } else {
      // If not, we keep base priority + planModifier
      return Math.ceil(
        basePriority + Math.ceil((setLength - bucketLimit) * planModifier)
      );
    }
  } catch (e) {
    Logger.error(
      `Get job priority failed: ${team_id}, ${plan}, ${basePriority}`
    );
    return basePriority;
  }
}
