import express from "express";
import { prisma } from "../../../packages/db/src/client";
import { generateReminderTimes, getReminderOffsets } from "./utils/remainder";
import { Queue } from "bullmq";
import IORedis from "ioredis";

const app = express();
app.use(express.json());

const connection = new IORedis({
  host: "127.0.0.1",
  port: 6379,
  maxRetriesPerRequest: null
});

const reminderQueue = new Queue("reminder-queue", { connection })

app.get("/", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (err) {
    res.status(500).json({ err: "DB error" });
  }
});


app.post("/user", async (req, res) => {
  try {
    const { email }  = req.body;

    const user = await prisma.user.create({
      data: {
        email,
      },
    });

    res.json(user);
  } catch (err)
  {
    console.error(err);
    res.status(500).json({ err: "Failed to create user"});
  }
});

app.post("/task", async (req, res) => {
  try {
    const { title, link, priority, type, dateTime, endTime, userId } = req.body;

    const taskTime = new Date(dateTime);

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if(!user) {
      return res.status(404).json({ err: "User not found" });
    }

    const task = await prisma.task.create({
      data: {
        title,
        link,
        priority,
        type,
        dateTime: taskTime,
        endTime: endTime ? new Date(endTime) : null,
        userId
      }
    });

    const offsets = getReminderOffsets(priority);
    const reminderTimes = generateReminderTimes(taskTime, offsets);

    const reminderJobs = await Promise.all(
      reminderTimes.map(async (time) => {
        const delay = time.getTime() - Date.now();

        if(delay <= 0) return null;

        const job = await reminderQueue.add(
          "reminder",
          {
            taskId: task.id,
            title: task.title,
            email: user.email
          },
          {
            delay
          }
        );

        return prisma.reminderJob.create({
          data: {
            taskId: task.id,
            scheduledTime: time,
            jobId: job.id as string
          }
        });
      })
    );

    res.json({ task, reminders: reminderJobs });
  } catch(err)
  {
    console.error(err);
    res.status(500).json( { err } )
  }
})

app.listen(3000);