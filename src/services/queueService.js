const { Queue, Worker } = require('bullmq');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { getRedisClient, isRedisAvailable } = require('../config/redis');
const Task = require('../models/Task');
const User = require('../models/User');

// Create Ethereal / Simulated Nodemailer Transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: process.env.EMAIL_USER || 'test@example.com',
    pass: process.env.EMAIL_PASS || 'testpass'
  }
});

// Helper to simulate/log email sending
const sendEmailLog = async (to, subject, htmlContent) => {
  console.log(`\n======================================================`);
  console.log(`[Email Service] Simulated Email Sent!`);
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`------------------------------------------------------`);
  console.log(htmlContent.replace(/<[^>]*>/g, '').trim()); // Strip HTML tags for clean console view
  console.log(`======================================================\n`);
  
  // Attempt ethereal dispatch, catch errors quietly since it's a dev sandbox
  try {
    const info = await transporter.sendMail({
      from: '"Smart Task Manager" <no-reply@smarttask.com>',
      to,
      subject,
      html: htmlContent
    });
    console.log(`[Email Service] Ethereal URL: ${nodemailer.getTestMessageUrl(info) || 'None'}`);
  } catch (err) {
    // Quietly log error
    console.log(`[Email Service] SMTP dispatch skipped (Ethereal demo).`);
  }
};

let emailQueue = null;
let emailWorker = null;

const initQueues = () => {
  const redisAvailable = isRedisAvailable();
  
  if (redisAvailable) {
    const client = getRedisClient();
    
    console.log('[Queue Service] Initializing BullMQ with Redis...');
    
    emailQueue = new Queue('emailQueue', {
      connection: client
    });

    emailWorker = new Worker('emailQueue', async (job) => {
      const { type, data } = job.data;
      console.log(`[Queue Service] [BullMQ] Processing job: ${job.name} (Type: ${type})`);
      await processJob(type, data);
    }, {
      connection: client
    });

    emailWorker.on('failed', (job, err) => {
      console.error(`[Queue Service] [BullMQ] Job ${job.id} failed:`, err.message);
    });

    emailWorker.on('completed', (job) => {
      console.log(`[Queue Service] [BullMQ] Job ${job.id} completed successfully.`);
    });
    
  } else {
    console.log('[Queue Service] Redis down. Initializing fallback Cron-based Scheduler (In-Memory)...');
  }

  // Setup cron jobs for background reports/reminders
  // 1. Task Reminder (Runs every hour to check for tasks due today)
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron Job] Checking for due tasks...');
    await checkAndSendTaskReminders();
  });

  // 2. Daily Summary (Runs daily at midnight)
  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron Job] Generating daily summaries...');
    await generateDailySummaries();
  });

  // 3. Weekly Report (Runs every Sunday at midnight)
  cron.schedule('0 0 * * 0', async () => {
    console.log('[Cron Job] Generating weekly reports...');
    await generateWeeklyReports();
  });
  
  // For demonstration: Run checkAndSendTaskReminders and summaries 15 seconds after boot
  setTimeout(async () => {
    console.log('[Queue Service] Performing initial startup background job verification...');
    await checkAndSendTaskReminders();
  }, 15000);
};

// Helper: Process Job Logic (shared by BullMQ and Cron fallback)
const processJob = async (type, data) => {
  try {
    switch (type) {
      case 'TASK_REMINDER': {
        const { taskTitle, userEmail, taskDescription, dueDate } = data;
        await sendEmailLog(
          userEmail,
          `⚠️ Task Reminder: "${taskTitle}" is due soon!`,
          `<div style="font-family: sans-serif; background: #111827; color: #f3f4f6; padding: 20px; border-radius: 8px;">
            <h2 style="color: #f59e0b;">Task Due Reminder</h2>
            <p>Hello,</p>
            <p>This is a friendly reminder that your task is due: <strong>${taskTitle}</strong></p>
            <p><strong>Description:</strong> ${taskDescription}</p>
            <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleString()}</p>
            <br>
            <p style="color: #9ca3af; font-size: 12px;">Automated notification from Smart Task Manager.</p>
           </div>`
        );
        break;
      }
      case 'DAILY_SUMMARY': {
        const { username, userEmail, pendingCount, completedCount, highPriorityCount } = data;
        await sendEmailLog(
          userEmail,
          `📋 Your Daily Task Summary - ${new Date().toLocaleDateString()}`,
          `<div style="font-family: sans-serif; background: #111827; color: #f3f4f6; padding: 20px; border-radius: 8px;">
            <h2 style="color: #3b82f6;">Daily Dashboard Summary</h2>
            <p>Hello ${username},</p>
            <p>Here is your daily task dashboard update:</p>
            <ul>
              <li><strong>Pending Tasks:</strong> ${pendingCount}</li>
              <li><strong>Completed Tasks:</strong> ${completedCount}</li>
              <li><strong>High Priority Tasks:</strong> ${highPriorityCount}</li>
            </ul>
            <p>Stay productive today!</p>
            <br>
            <p style="color: #9ca3af; font-size: 12px;">Automated notification from Smart Task Manager.</p>
           </div>`
        );
        break;
      }
      case 'WEEKLY_REPORT': {
        const { username, userEmail, completionRate, totalTasks } = data;
        await sendEmailLog(
          userEmail,
          `📊 Weekly Performance Report - Smart Task Manager`,
          `<div style="font-family: sans-serif; background: #111827; color: #f3f4f6; padding: 20px; border-radius: 8px;">
            <h2 style="color: #10b981;">Weekly Performance Insights</h2>
            <p>Hello ${username},</p>
            <p>Here are your productivity statistics for the past week:</p>
            <ul>
              <li><strong>Total Tasks Managed:</strong> ${totalTasks}</li>
              <li><strong>Task Completion Rate:</strong> ${completionRate}%</li>
            </ul>
            <p>Keep up the great work in the coming week!</p>
            <br>
            <p style="color: #9ca3af; font-size: 12px;">Automated notification from Smart Task Manager.</p>
           </div>`
        );
        break;
      }
      default:
        console.warn(`[Queue Service] Unknown job type: ${type}`);
    }
  } catch (err) {
    console.error(`[Queue Service] Error executing job of type ${type}:`, err.message);
  }
};

// Dispatch functions (invoked by HTTP actions or background checks)
const dispatchEmailJob = async (type, name, data) => {
  if (isRedisAvailable() && emailQueue) {
    try {
      await emailQueue.add(name, { type, data });
      console.log(`[Queue Service] Job added to BullMQ: ${name}`);
      return;
    } catch (err) {
      console.error('[Queue Service] BullMQ dispatch failed, running inline:', err.message);
    }
  }
  
  // Fallback: run inline or print warning
  console.log(`[Queue Service] [In-Memory Fallback] Running job "${name}" immediately.`);
  processJob(type, data);
};

// Background Scanners

const checkAndSendTaskReminders = async () => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Find incomplete tasks due today
    const dueTasks = await Task.find({
      completed: false,
      dueDate: { $gte: todayStart, $lte: todayEnd }
    }).populate('user');

    console.log(`[Background Jobs] Found ${dueTasks.length} tasks due today to remind users.`);

    for (const task of dueTasks) {
      if (task.user && task.user.email) {
        await dispatchEmailJob('TASK_REMINDER', `reminder_task_${task._id}`, {
          taskTitle: task.title,
          taskDescription: task.description,
          dueDate: task.dueDate,
          userEmail: task.user.email
        });
      }
    }
  } catch (err) {
    console.error('[Background Jobs] Error scanning task reminders:', err.message);
  }
};

const generateDailySummaries = async () => {
  try {
    const users = await User.find({});
    for (const user of users) {
      const tasks = await Task.find({ user: user._id });
      const pendingCount = tasks.filter(t => !t.completed).length;
      const completedCount = tasks.filter(t => t.completed).length;
      const highPriorityCount = tasks.filter(t => !t.completed && t.priority === 'High').length;

      await dispatchEmailJob('DAILY_SUMMARY', `daily_summary_user_${user._id}`, {
        username: user.username,
        userEmail: user.email,
        pendingCount,
        completedCount,
        highPriorityCount
      });
    }
  } catch (err) {
    console.error('[Background Jobs] Error generating daily summaries:', err.message);
  }
};

const generateWeeklyReports = async () => {
  try {
    const users = await User.find({});
    for (const user of users) {
      const tasks = await Task.find({ user: user._id });
      const totalTasks = tasks.length;
      const completedCount = tasks.filter(t => t.completed).length;
      const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

      await dispatchEmailJob('WEEKLY_REPORT', `weekly_report_user_${user._id}`, {
        username: user.username,
        userEmail: user.email,
        totalTasks,
        completionRate
      });
    }
  } catch (err) {
    console.error('[Background Jobs] Error generating weekly reports:', err.message);
  }
};

module.exports = {
  initQueues,
  dispatchEmailJob,
  checkAndSendTaskReminders,
  generateDailySummaries,
  generateWeeklyReports
};
