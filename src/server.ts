import "dotenv/config";
import basicAuth from "basic-auth";
import express, { NextFunction, Request, Response } from "express";
import { prisma } from "./prisma.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const adminUser = process.env.ADMIN_USER ?? "";
const adminPass = process.env.ADMIN_PASS ?? "";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const credentials = basicAuth(req);
  const valid =
    credentials &&
    credentials.name === adminUser &&
    credentials.pass === adminPass;

  if (!valid) {
    res.setHeader("WWW-Authenticate", "Basic realm=\"Admin\"");
    res.status(401).send("Authentication required");
    return;
  }

  next();
};

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/admin", requireAuth, async (_req, res) => {
  const [leads, inbox] = await Promise.all([
    prisma.lead.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.inboxMessage.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const leadRows = leads
    .map(
      (lead) => `
        <tr>
          <td>${lead.id}</td>
          <td>${lead.name}</td>
          <td>${lead.phone}</td>
          <td>${lead.comment}</td>
          <td>${lead.processed ? "✅" : "❌"}</td>
          <td>${new Date(lead.createdAt).toLocaleString()}</td>
          <td>
            <form method="POST" action="/admin/leads/${lead.id}/processed">
              <button type="submit">Mark processed</button>
            </form>
          </td>
        </tr>
      `
    )
    .join("");

  const inboxRows = inbox
    .map(
      (msg) => `
        <tr>
          <td>${msg.id}</td>
          <td>${msg.telegramUserId}</td>
          <td>${msg.username ?? ""}</td>
          <td>${msg.message}</td>
          <td>${msg.processed ? "✅" : "❌"}</td>
          <td>${new Date(msg.createdAt).toLocaleString()}</td>
          <td>
            <form method="POST" action="/admin/inbox/${msg.id}/processed">
              <button type="submit">Mark processed</button>
            </form>
          </td>
        </tr>
      `
    )
    .join("");

  res.send(`
    <html>
      <head>
        <title>Bot Panel Admin</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 32px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; }
        </style>
      </head>
      <body>
        <h1>Leads</h1>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Comment</th>
              <th>Processed</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>${leadRows || "<tr><td colspan='7'>No leads yet.</td></tr>"}</tbody>
        </table>

        <h1>Inbox Messages</h1>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User ID</th>
              <th>Username</th>
              <th>Message</th>
              <th>Processed</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>${inboxRows || "<tr><td colspan='7'>No inbox messages yet.</td></tr>"}</tbody>
        </table>
      </body>
    </html>
  `);
});

app.post("/admin/leads/:id/processed", requireAuth, async (req, res) => {
  await prisma.lead.update({
    where: { id: Number(req.params.id) },
    data: { processed: true },
  });

  res.redirect("/admin");
});

app.post("/admin/inbox/:id/processed", requireAuth, async (req, res) => {
  await prisma.inboxMessage.update({
    where: { id: Number(req.params.id) },
    data: { processed: true },
  });

  res.redirect("/admin");
});

app.get("/api/leads", requireAuth, async (_req, res) => {
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" } });
  res.json(leads);
});

app.get("/api/inbox", requireAuth, async (_req, res) => {
  const inbox = await prisma.inboxMessage.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(inbox);
});

app.post("/api/leads/:id/processed", requireAuth, async (req, res) => {
  const lead = await prisma.lead.update({
    where: { id: Number(req.params.id) },
    data: { processed: true },
  });
  res.json(lead);
});

app.post("/api/inbox/:id/processed", requireAuth, async (req, res) => {
  const message = await prisma.inboxMessage.update({
    where: { id: Number(req.params.id) },
    data: { processed: true },
  });
  res.json(message);
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
