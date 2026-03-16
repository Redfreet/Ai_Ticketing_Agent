import { Queue } from "bullmq";
import dotenv from "dotenv";

dotenv.config();

export const connection = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
};

export const ticketQueue = new Queue("ticket-queue", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: true,
  },
});
