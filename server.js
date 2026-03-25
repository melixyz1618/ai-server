import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";
import { Resend } from "resend";
import mysql from "mysql2/promise";

dotenv.config();

// 🔹 DB CONNECTION (TEMİZ VE DOĞRU)
const db = await mysql.createPool(process.env.DATABASE_URL);

const resend = new Resend(process.env.RESEND_API_KEY);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 🔹 OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


// =====================================================
// 🔥 CHAT
// =====================================================
app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;

  if (!userMessage) {
    return res.status(400).json({ error: "Mesaj boş olamaz" });
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: "Sen profesyonel bir yazılım danışmanısın. Kısa ve net cevap ver."
        },
        {
          role: "user",
          content: userMessage
        }
      ]
    });

    res.json({
      reply: response.choices[0].message.content
    });

  } catch (err) {
    console.error("AI ERROR:", err.message);
    res.status(500).json({ error: "AI hata" });
  }
});


// =====================================================
// 🔥 OFFER → DB KAYIT
// =====================================================
app.post("/offer", async (req, res) => {

  const { name, email, phone, projectType, details } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: "Zorunlu alanlar eksik" });
  }

  try {
    await db.execute(
      `INSERT INTO offers (name, email, phone, project_type, details)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, phone, projectType, details]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("DB ERROR:", err);
    res.status(500).json({ error: "DB error" });
  }

});


// =====================================================
// 🔥 MAIL
// =====================================================
app.post("/send-mail", async (req, res) => {

  const { email, name, details } = req.body;

  try {

    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Talebiniz alındı",
      html: `<p>Merhaba ${name}, talebiniz alındı.</p>`
    });


    await resend.emails.send({
     from: "Melih Sancar <info@melihsancar.com>",
      to: "info@melihsancar.com",
      subject: "Yeni müşteri",
      html: `<p>${name} - ${email}</p><p>${details}</p>`
    });

    res.json({ success: true });

  } catch (error) {
    console.error("MAIL ERROR:", error);
    res.status(500).json({ error: "Mail hatası" });
  }
console.log("MAIL FROM:", "info@melihsancar.com");
});


// =====================================================
// 🔥 GET OFFERS (DB)
// =====================================================
app.get("/offers", async (req, res) => {

  try {
    const [rows] = await db.execute("SELECT * FROM offers ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "DB error" });
  }

});


// =====================================================
// 🔥 HEALTH
// =====================================================
app.get("/", (req, res) => {
  res.send("Server çalışıyor 🚀");
});


// =====================================================
// 🚀 START
// =====================================================
app.listen(PORT, () => {
  console.log(`Server çalışıyor: http://localhost:${PORT}`);
});