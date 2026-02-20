const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const twilio = require("twilio");
const crypto = require("crypto");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");

admin.initializeApp();
const db = admin.firestore();

function getDateKeyInTimeZone(timeZone) {
  const now = new Date();
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return formatted;
}

function parseAccountKey(accountKey) {
  const parts = accountKey.split("|");
  return {
    phoneNumber: parts[0] || "",
    dob: parts.slice(1).join("|") || "",
  };
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function toE164India(phoneNumber) {
  const normalized = normalizePhone(phoneNumber);
  if (!normalized) return null;
  if (normalized.length === 10) return `+91${normalized}`;
  if (normalized.length === 12 && normalized.startsWith("91")) {
    return `+${normalized}`;
  }
  if (normalized.length >= 11 && String(phoneNumber || "").trim().startsWith("+")) {
    return `+${normalized}`;
  }
  return null;
}

function toWhatsAppAddress(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  return trimmed.startsWith("whatsapp:") ? trimmed : `whatsapp:${trimmed}`;
}

function base64urlEncode(value) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64urlDecode(value) {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function createAdminSessionToken(secret, payload) {
  const headerSegment = base64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadSegment = base64urlEncode(JSON.stringify(payload));
  const content = `${headerSegment}.${payloadSegment}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(content)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `${content}.${signature}`;
}

function verifyAdminSessionToken(secret, token) {
  if (!token || token.split(".").length !== 3) return null;

  const [headerSegment, payloadSegment, signatureSegment] = token.split(".");
  const content = `${headerSegment}.${payloadSegment}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(content)
    .digest();

  const provided = Buffer.from(
    signatureSegment.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  );
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64urlDecode(payloadSegment));
    if (!payload || typeof payload !== "object") return null;
    if (payload.role !== "admin") return null;
    if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function setCorsHeaders(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
}

exports.adminSessionLogin = onRequest(
  {
    region: process.env.FUNCTIONS_REGION || "us-central1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (req, res) => {
    setCorsHeaders(res);
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "method-not-allowed" });
      return;
    }

    const adminPhone = normalizePhone(process.env.ADMIN_LOGIN_PHONE || "");
    const adminDob = String(process.env.ADMIN_LOGIN_DOB || "").trim();
    const sessionSecret = String(process.env.ADMIN_SESSION_SECRET || "");
    if (!adminPhone || !adminDob || !sessionSecret) {
      logger.error("Admin login env vars are missing.");
      res.status(503).json({ error: "admin-login-not-configured" });
      return;
    }

    const phoneNumber = normalizePhone(req.body?.phoneNumber || "");
    const dob = String(req.body?.dob || "").trim();
    if (!phoneNumber || !dob) {
      res.status(400).json({ error: "missing-credentials" });
      return;
    }

    if (phoneNumber !== adminPhone || dob !== adminDob) {
      res.status(401).json({ error: "invalid-credentials" });
      return;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresAtSeconds = nowSeconds + 8 * 60 * 60;
    const token = createAdminSessionToken(sessionSecret, {
      role: "admin",
      iat: nowSeconds,
      exp: expiresAtSeconds,
    });

    res.status(200).json({
      token,
      expiresAt: expiresAtSeconds * 1000,
    });
  },
);

exports.adminSessionVerify = onRequest(
  {
    region: process.env.FUNCTIONS_REGION || "us-central1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (req, res) => {
    setCorsHeaders(res);
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "method-not-allowed" });
      return;
    }

    const sessionSecret = String(process.env.ADMIN_SESSION_SECRET || "");
    if (!sessionSecret) {
      res.status(503).json({ valid: false, error: "admin-login-not-configured" });
      return;
    }

    const token = String(req.body?.token || "");
    const payload = verifyAdminSessionToken(sessionSecret, token);
    if (!payload) {
      res.status(401).json({ valid: false, error: "invalid-session" });
      return;
    }

    res.status(200).json({ valid: true, expiresAt: payload.exp * 1000 });
  },
);

function toCsv(rows) {
  const escape = (value) => {
    const str = value == null ? "" : String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = [
    "dateKey",
    "accountKey",
    "fullName",
    "phoneNumber",
    "dob",
    "hotiNo",
    "points",
    "submitted",
    "checkedNiyamsCount",
  ];

  const lines = [header.join(",")];
  rows.forEach((row) => {
    lines.push(
      [
        row.dateKey,
        row.accountKey,
        row.fullName,
        row.phoneNumber,
        row.dob,
        row.hotiNo,
        row.points,
        row.submitted,
        row.checkedNiyamsCount,
      ]
        .map(escape)
        .join(","),
    );
  });
  return `${lines.join("\n")}\n`;
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

exports.sendDailySubmissionBackup = onSchedule(
  {
    schedule: process.env.DAILY_BACKUP_CRON || "0 22 * * *",
    timeZone: process.env.DAILY_BACKUP_TIMEZONE || "Asia/Kolkata",
    memory: "256MiB",
    timeoutSeconds: 120,
  },
  async () => {
    const adminEmail = process.env.ADMIN_BACKUP_EMAIL;
    if (!adminEmail) {
      logger.error("ADMIN_BACKUP_EMAIL is not configured.");
      return;
    }

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.error("SMTP configuration is incomplete.");
      return;
    }

    const timeZone = process.env.DAILY_BACKUP_TIMEZONE || "Asia/Kolkata";
    const dateKey = getDateKeyInTimeZone(timeZone);
    logger.info(`Preparing backup for dateKey=${dateKey} (${timeZone})`);

    const progressSnap = await db
      .collection("progress")
      .where("dateKey", "==", dateKey)
      .where("submitted", "==", true)
      .get();

    if (progressSnap.empty) {
      logger.info(`No submitted progress found for ${dateKey}. Sending summary email.`);
    }

    const rows = [];
    for (const doc of progressSnap.docs) {
      const data = doc.data();
      const accountKey = data.accountKey || "";
      const accountDoc = await db.collection("accounts").doc(accountKey).get();
      const account = accountDoc.exists ? accountDoc.data() : null;
      const fallback = parseAccountKey(accountKey);
      const checklist = data.checklist || {};
      const checkedNiyamsCount = Object.values(checklist).filter(Boolean).length;

      rows.push({
        dateKey,
        accountKey,
        fullName: account?.fullName || "",
        phoneNumber: account?.phoneNumber || fallback.phoneNumber,
        dob: account?.dob || fallback.dob,
        hotiNo: account?.hotiNo || "",
        points: Number(data.points || 0),
        submitted: data.submitted ? "true" : "false",
        checkedNiyamsCount,
      });
    }

    const csv = toCsv(rows);
    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: adminEmail,
      subject: `Daily Niyam Backup - ${dateKey}`,
      text:
        rows.length === 0
          ? `No submitted records found for ${dateKey}.`
          : `Attached is the submitted data backup for ${dateKey}. Total records: ${rows.length}.`,
      attachments: [
        {
          filename: `daily-niyam-backup-${dateKey}.csv`,
          content: csv,
          contentType: "text/csv",
        },
      ],
    });

    logger.info(`Backup email sent for ${dateKey}. Rows=${rows.length}`);
  },
);

exports.sendRegistrationNotification = onDocumentCreated(
  {
    document: "accounts/{accountId}",
    region: process.env.FUNCTIONS_REGION || "us-central1",
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      logger.error(
        "TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN missing. Registration notification skipped.",
      );
      return;
    }

    const snapshot = event.data;
    if (!snapshot) return;

    const account = snapshot.data() || {};
    const fallback = parseAccountKey(snapshot.id);
    const phoneNumber = account.phoneNumber || fallback.phoneNumber;
    const to = toE164India(phoneNumber);

    if (!to) {
      logger.warn(`Invalid recipient phone for accountId=${snapshot.id}`);
      return;
    }

    const fullName =
      account.fullName ||
      [account.firstName, account.middleName, account.lastName].filter(Boolean).join(" ").trim() ||
      "User";
    const messageText =
      process.env.REGISTRATION_NOTIFY_TEXT ||
      `Jai Jinendra ${fullName}, your registration is successful.`;

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    let sentBy = "";

    if (process.env.TWILIO_WHATSAPP_FROM) {
      try {
        await client.messages.create({
          body: messageText,
          from: toWhatsAppAddress(process.env.TWILIO_WHATSAPP_FROM),
          to: toWhatsAppAddress(to),
        });
        sentBy = "whatsapp";
      } catch (error) {
        logger.warn(`WhatsApp notification failed for accountId=${snapshot.id}`, error);
      }
    }

    if (!sentBy && process.env.TWILIO_SMS_FROM) {
      try {
        await client.messages.create({
          body: messageText,
          from: String(process.env.TWILIO_SMS_FROM).trim(),
          to,
        });
        sentBy = "sms";
      } catch (error) {
        logger.error(`SMS notification failed for accountId=${snapshot.id}`, error);
      }
    }

    if (!sentBy) {
      logger.error(
        `Registration notification not sent for accountId=${snapshot.id}; check TWILIO_WHATSAPP_FROM / TWILIO_SMS_FROM.`,
      );
      return;
    }

    logger.info(`Registration notification sent via ${sentBy} to ${to}`);
  },
);
