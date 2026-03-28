import express from "express";
import { prisma } from "../../../packages/db/src/client";
import { generateReminderTimes, getReminderOffsets } from "./utils/remainder";

const app = express();
app.use(express.json());

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
      reminderTimes.map((time) => 
        prisma.reminderJob.create({
          data: {
            taskId: task.id,
            scheduledTime: time,
            jobId: "pending"
          }
        })
      )
    );

    res.json({ task, reminders: reminderJobs });
  } catch(err)
  {
    console.error(err);
    res.status(500).json( { err } )
  }
})

app.listen(3000);