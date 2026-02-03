import "dotenv/config";
import { Telegraf, session } from "telegraf";
import { prisma } from "./prisma.js";

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error("BOT_TOKEN is required");
}

interface LeadSession {
  step: "name" | "phone" | "comment";
  name?: string;
  phone?: string;
}

interface BotSession {
  lead?: LeadSession;
}

const bot = new Telegraf<BotSession>(token);

bot.use(session());

bot.start(async (ctx) => {
  await ctx.reply(
    "Welcome! Use /newlead to submit a lead, or send any message to add to the inbox."
  );
});

bot.help(async (ctx) => {
  await ctx.reply(
    "/newlead - create a new lead\nSend any message to store it in the inbox."
  );
});

bot.command("newlead", async (ctx) => {
  ctx.session.lead = { step: "name" };
  await ctx.reply("Let's create a new lead. What's the name?");
});

bot.on("text", async (ctx) => {
  const text = ctx.message.text.trim();

  if (ctx.session.lead) {
    const lead = ctx.session.lead;
    if (lead.step === "name") {
      lead.name = text;
      lead.step = "phone";
      await ctx.reply("Phone number?");
      return;
    }

    if (lead.step === "phone") {
      lead.phone = text;
      lead.step = "comment";
      await ctx.reply("Any comment?");
      return;
    }

    if (lead.step === "comment") {
      await prisma.lead.create({
        data: {
          name: lead.name ?? "",
          phone: lead.phone ?? "",
          comment: text,
        },
      });
      ctx.session.lead = undefined;
      await ctx.reply("Thanks! Lead saved.");
      return;
    }
  }

  await prisma.inboxMessage.create({
    data: {
      telegramUserId: String(ctx.from.id),
      username: ctx.from.username ?? null,
      message: text,
    },
  });

  await ctx.reply("Message stored in the inbox. Thanks!");
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
