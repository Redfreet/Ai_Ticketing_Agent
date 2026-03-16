import { Worker } from "bullmq";
import Ticket from "../models/ticket.js";
import User from "../models/user.js";
import analyzeTicket from "../utils/ai.js";
import { connection } from "../config/queue.config.js";

export const ticketWorker = new Worker(
  "ticket-queue",
  async (job) => {
    const { ticketId } = job.data;
    console.log(`[Worker] Processing ticket: ${ticketId}`);

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) throw new Error("Ticket not found");

    await Ticket.findByIdAndUpdate(ticketId, { status: "TODO" });

    const aiResponse = await analyzeTicket(ticket);
    let relatedskills = [];

    //Updating with AI Data
    if (aiResponse) {
      await Ticket.findByIdAndUpdate(ticketId, {
        priority: !["low", "medium", "high"].includes(aiResponse.priority)
          ? "medium"
          : aiResponse.priority,
        helpfulNotes: aiResponse.helpfulNotes,
        status: "IN_PROGRESS",
        relatedSkills: aiResponse.relatedSkills,
      });
      relatedskills = aiResponse.relatedSkills;
    }

    //Assigning Moderator
    let user = null;
    if (relatedskills && relatedskills.length > 0) {
      user = await User.findOne({
        role: "moderator",
        skills: {
          $elemMatch: {
            $regex: relatedskills.join("|"),
            $options: "i",
          },
        },
      });
    }

    if (!user) {
      user = await User.findOne({ role: "admin" });
    }

    await Ticket.findByIdAndUpdate(ticketId, {
      assignedTo: user?._id || null,
    });

    return { success: true };
  },
  { connection },
);

ticketWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

ticketWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});
