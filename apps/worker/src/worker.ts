import IORedis from "ioredis";
import { Worker } from "bullmq";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const connection = new IORedis({
    host: "127.0.0.1",
    port: 6379,
    maxRetriesPerRequest: null
});

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const worker = new Worker(
    "reminder-queue",
    async (job) => {
        console.log("Executing reminder job: ", job.data);

        const { title } = job.data;

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: "Task Reminder",
            text: `Hey Praveen, 
                You have reminder for: "${title}"
                Stay focused and complete it.

            -- Priorix`
        })
    },
    { connection }
);

worker.on("completed", (job) => {
    console.log(`Job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
    console.error(`Job failed: ${job?.id}`, err);
});