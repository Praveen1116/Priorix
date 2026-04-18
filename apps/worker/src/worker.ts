import IORedis from "ioredis";
import { Worker } from "bullmq";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { error } from "node:console";
dotenv.config();

import { prisma } from "../../../packages/db/src/client";

const connection = new IORedis(process.env.REDIS_URL as string, {
    maxRetriesPerRequest: null
});

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

const worker = new Worker(
    "reminder-queue",
    async (job) => {
        console.log("Executing reminder job: ", job.data);

        const { title, email, taskId } = job.data;

        if(!email) {
            throw new Error("Email not found in job data");
        }
        
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: "Task Reminder",
                text: `Hey, 
                    You have reminder for: "${title}"
                    Stay focused and complete it.

                -- Priorix`
            });

            await prisma.reminderLog.create({
                data: {
                    taskId,
                    status: "SUCCESS"
                }
            });
        } catch(err) {
            console.error("Email failed:", err);

            await prisma.reminderLog.create({
                data: {
                    taskId,
                    status: "FAILED"
                }
            });

            throw err;
        }
    },
    { connection }
);

worker.on("completed", (job) => {
    console.log(`Job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
    console.error(`Job failed: ${job?.id}`, err);
});