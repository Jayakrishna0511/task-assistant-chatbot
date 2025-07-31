require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cron = require("node-cron");
const twilio = require("twilio");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI;


const taskSchema = new mongoose.Schema({
  task: { type: String, required: true },
  time: { type: String, required: true },
  scheduledTime: { type: Date, required: true },
  phone: { type: String },
  email: { type: String },
  notificationSent: { type: Boolean, default: false },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Task = mongoose.model("Task", taskSchema);

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

// Twilio Setup
const twilioClient = process.env.TWILIO_SID && process.env.TWILIO_TOKEN ? 
  twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN) : null;

// Email Setup 
const emailTransporter = process.env.EMAIL_USER && process.env.EMAIL_PASS ? 
  nodemailer.createTransport({
    service: 'gmail', 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  }) : null;

// Helper function to parse time strings
function parseTimeToDate(timeString) {
  const now = new Date();
  const [time, period] = timeString.trim().split(/\s+/);
  let [hours, minutes = 0] = time.split(':').map(Number);
  
  if (period && period.toLowerCase().includes('pm') && hours !== 12) {
    hours += 12;
  } else if (period && period.toLowerCase().includes('am') && hours === 12) {
    hours = 0;
  }
  
  const scheduledDate = new Date(now);
  scheduledDate.setHours(hours, minutes, 0, 0);
  
  // If the time has passed today, schedule for tomorrow
  if (scheduledDate <= now) {
    scheduledDate.setDate(scheduledDate.getDate() + 1);
  }
  
  return scheduledDate;
}

// Send SMS notification
async function sendSMSNotification(phone, taskText) {
  if (!twilioClient) {
    console.log("Twilio not configured, skipping SMS");
    return false;
  }
  
  try {
    await twilioClient.messages.create({
      body: `🚨 Task Reminder: It's time to ${taskText}! Don't forget! 📝`,
      from: process.env.TWILIO_PHONE,
      to: phone
    });
    console.log(`📱 SMS sent to ${phone}`);
    return true;
  } catch (error) {
    console.error("SMS Error:", error);
    return false;
  }
}

// Send Email notification
async function sendEmailNotification(email, taskText) {
  if (!emailTransporter) {
    console.log("Email not configured, skipping email");
    return false;
  }
  
  try {
    await emailTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "🚨 Task Reminder - Don't Forget!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #f97316, #ea580c); border-radius: 15px;">
          <div style="background: white; padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: #f97316; margin-bottom: 20px;">🚨 Task Reminder!</h1>
            <div style="font-size: 18px; color: #333; margin-bottom: 20px;">
              It's time to: <strong style="color: #f97316;">${taskText}</strong>
            </div>
            <div style="background: #f97316; color: white; padding: 15px; border-radius: 8px; font-weight: bold;">
              Don't forget to complete your task! 📝
            </div>
          </div>
        </div>
      `
    });
    console.log(`✉️ Email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Email Error:", error);
    return false;
  }
}

// Cron job to check for due tasks every minute
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    const dueTasks = await Task.find({
      scheduledTime: { $lte: now },
      notificationSent: false,
      completed: false
    });

    for (const task of dueTasks) {
      console.log(`⏰ Processing notification for task: ${task.task}`);
      
      let notificationSent = false;
      
      // Try SMS first if phone number is provided
      if (task.phone) {
        notificationSent = await sendSMSNotification(task.phone, task.task);
      }
      
      // Try email if SMS failed or phone not provided
      if (!notificationSent && task.email) {
        notificationSent = await sendEmailNotification(task.email, task.task);
      }
      
      // Mark notification as sent (even if it failed, to avoid spam)
      await Task.updateOne(
        { _id: task._id },
        { notificationSent: true }
      );
      
      if (notificationSent) {
        console.log(`✅ Notification sent for task: ${task.task}`);
      } else {
        console.log(`❌ Failed to send notification for task: ${task.task}`);
      }
    }
  } catch (error) {
    console.error("Cron job error:", error);
  }
});

app.post("/api/chat", async (req, res) => {
  const message = req.body.message?.toLowerCase();
  const { phone, email } = req.body;
  let reply = "🤖 Sorry, I didn't understand that. Try commands like:\n- Remind me to walk at 6 PM\n- Show tasks\n- Delete task 1";

  try {
    if (message.startsWith("remind me")) {
      const timeMatch = message.match(/at\s(.+)$/);
      const task = message.replace(/remind me to\s?/i, "").replace(/at .+/, "").trim();

      if (task && timeMatch) {
        const scheduledTime = parseTimeToDate(timeMatch[1]);
        
        const newTask = await Task.create({ 
          task, 
          time: timeMatch[1], 
          scheduledTime,
          phone: phone || null,
          email: email || null
        });
        
        const contactMethod = phone ? "SMS" : email ? "email" : "browser notification";
        const timeStr = scheduledTime.toLocaleString();
        
        reply = `✅ Perfect! I'll remind you to **${task}** at **${timeMatch[1]}** (${timeStr}) via ${contactMethod}. 📲`;
      } else {
        reply = "❗ Please use: `Remind me to <task> at <time>`. Example: 'Remind me to call mom at 6 PM'";
      }
      
    } else if (message.includes("show tasks")) {
      const tasks = await Task.find({ completed: false }).sort({ scheduledTime: 1 });
      if (tasks.length === 0) {
        reply = "📭 You have no pending tasks.";
      } else {
        reply = "📋 **Your upcoming tasks:**\n\n" + 
          tasks.map((t, i) => {
            const status = t.notificationSent ? "🔔" : "⏰";
            const contact = t.phone ? "📱" : t.email ? "✉️" : "🔕";
            return `${i + 1}. ${status} ${t.task} at ${t.time} ${contact}`;
          }).join("\n");
      }
      
    } else if (message.startsWith("delete task")) {
      const num = parseInt(message.split("delete task ")[1]);
      const tasks = await Task.find({ completed: false }).sort({ scheduledTime: 1 });
      if (!isNaN(num) && tasks[num - 1]) {
        const toDelete = tasks[num - 1];
        await Task.deleteOne({ _id: toDelete._id });
        reply = `🗑️ Deleted task: **${toDelete.task}**`;
      } else {
        reply = "❗ Invalid task number. Use 'show tasks' to see the list first.";
      }
      
    } else if (message.includes("complete task")) {
      const num = parseInt(message.split("complete task ")[1]);
      const tasks = await Task.find({ completed: false }).sort({ scheduledTime: 1 });
      if (!isNaN(num) && tasks[num - 1]) {
        const toComplete = tasks[num - 1];
        await Task.updateOne({ _id: toComplete._id }, { completed: true });
        reply = `✅ Marked as completed: **${toComplete.task}**. Great job! 🎉`;
      } else {
        reply = "❗ Invalid task number. Use 'show tasks' to see the list first.";
      }
    }
  } catch (err) {
    console.error(err);
    reply = "⚠️ Something went wrong. Please try again.";
  }

  res.json({ reply });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    notifications: {
      sms: !!twilioClient,
      email: !!emailTransporter
    }
  });
});

app.listen(3001, () => {
  console.log(" Server running at http://localhost:3001");
  console.log("SMS notifications:", twilioClient ? "✅ Enabled" : "❌ Disabled");
  console.log(" Email notifications:", emailTransporter ? "✅ Enabled" : "❌ Disabled");
  console.log("Cron job started - checking for due tasks every minute");
});

















