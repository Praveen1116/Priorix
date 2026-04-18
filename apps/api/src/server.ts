import express from "express";
import { prisma } from "../../../packages/db/src/client";
import { generateReminderTimes, getReminderOffsets } from "./utils/remainder";
import { Queue } from "bullmq";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import IORedis from "ioredis";
import cors from "cors";
import { error } from "node:console";
import { authMiddleware, AuthRequest } from "./middleware/auth";
import dotenv from "dotenv";
import { DateTime } from "luxon";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

const connection = new IORedis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null
});

const reminderQueue = new Queue("reminder-queue", { connection });

app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

app.get("/tasks", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await prisma.task.updateMany({
      where: {
        userId,
        status: "PENDING",
        dateTime: {
          lt: new Date(),
        },
      },
      data: {
        status: "MISSED",
      },
    });

    const tasks = await prisma.task.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});


app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email, 
        password: hashedPassword
      }
    });

    res.json({ message: "User registered", userId: user.id});
  } catch(err)
  {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email , password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if(!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);

    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/task", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { title, link, priority, type, dateTimeLocal, endTimeLocal, timeZone } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!dateTimeLocal || !timeZone) {
      return res.status(400).json({ error: "dateTimeLocal and timeZone are required" });
    }

    const taskDateTime = DateTime.fromISO(dateTimeLocal, { zone: timeZone });
    if (!taskDateTime.isValid) {
      return res.status(400).json({ error: "Invalid dateTimeLocal or timeZone" });
    }

    const endDateTime =
      endTimeLocal
        ? DateTime.fromISO(endTimeLocal, { zone: timeZone })
        : null;

    if (endDateTime && !endDateTime.isValid) {
      return res.status(400).json({ error: "Invalid endTimeLocal or timeZone" });
    }

    const taskTimeUtc = taskDateTime.toUTC().toJSDate();
    const endTimeUtc = endDateTime ? endDateTime.toUTC().toJSDate() : null;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ err: "User not found" });
    }

    const task = await prisma.task.create({
      data: {
        title,
        link,
        priority,
        type,
        dateTime: taskTimeUtc,
        endTime: endTimeUtc,
        timeZone,
        userId
      }
    });

    const offsets = getReminderOffsets(priority);
    const reminderTimes = generateReminderTimes(taskTimeUtc, offsets);

    const reminderJobs = await Promise.all(
      reminderTimes.map(async (time) => {
        const delay = time.getTime() - Date.now();

        if (delay <= 0) return null;

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
  } catch (err) {
    console.error(err);
    res.status(500).json({ err });
  }
});


app.patch("/task/:id/complete", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    const userId = req.userId;

    if(typeof id !== "string") {
      return res.status(400).json({ error: "Invalid task id" });
    }

    if(!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const existingTask = await prisma.task.findUnique({
      where: { id }
    })

    if(!existingTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    if(existingTask.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const task = await prisma.task.update({
      where: { id },
      data: { status : "COMPLETED" }
    });

    const reminders = await prisma.reminderJob.findMany({
      where: { taskId: id }
    });

    for (const reminder of reminders) {
      if(!reminder.jobId) continue;

      const job = await reminderQueue.getJob(reminder.jobId);

      if(job) {
        await job.remove();
      }
    }

    res.json({
      message: "Task completed and reminders cancelled",
      task
    });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: "Failed to complete the task" });
  }
});

app.delete("/task/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    const userId = req.userId;

    if (typeof id !== "string") {
      return res.status(400).json({ error: "Invalid task id" });
    }

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    if (existingTask.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const reminders = await prisma.reminderJob.findMany({
      where: { taskId: id },
    });

    for (const reminder of reminders) {
      if (!reminder.jobId) continue;

      const job = await reminderQueue.getJob(reminder.jobId);

      if (job) {
        await job.remove();
      }
    }

    await prisma.reminderJob.deleteMany({
      where: { taskId: id },
    });

    await prisma.task.delete({
      where: { id },
    });

    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete task" });
  }
});


const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
})