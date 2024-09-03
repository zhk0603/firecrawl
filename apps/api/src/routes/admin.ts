import express from "express";
import { redisHealthController } from "../controllers/v0/admin/redis-health";
import {
  autoscalerController,
  checkQueuesController,
  cleanBefore24hCompleteJobsController,
  queuesController,
} from "../controllers/v0/admin/queue";

export const adminRouter = express.Router();

adminRouter.get(
  `/admin/${process.env.BULL_AUTH_KEY}/redis-health`,
  redisHealthController
);

adminRouter.get(
  `/admin/${process.env.BULL_AUTH_KEY}/clean-before-24h-complete-jobs`,
  cleanBefore24hCompleteJobsController
);

adminRouter.get(
  `/admin/${process.env.BULL_AUTH_KEY}/check-queues`,
  checkQueuesController
);

adminRouter.get(
  `/admin/${process.env.BULL_AUTH_KEY}/queues`,
  queuesController
);

adminRouter.get(
  `/admin/${process.env.BULL_AUTH_KEY}/autoscaler`,
  autoscalerController
);
