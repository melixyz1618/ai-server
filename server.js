import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { Resend } from "resend";
import mysql from "mysql2/promise";

dotenv.config();

// =====================================================
// 🔹 DB CONNECTION
// =====================================================
const db = await mysql.createPool(process.env.DATABASE_URL);

// =====================================================
// 🔹 SERVICES
// =====================================================
const resend = new Resend(process.env.RESEND_API_KEY);

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// =====================================================
// 🔹 APP INIT
// =====================================================
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;


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
// 🔥 OFFER → DB
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

    // 📩 MÜŞTERİYE GİDEN MAIL
    await resend.emails.send({
      from: "Melih Sancar <info@melihsancar.com>",
      to: email,
      subject: "Talebiniz alındı",
      html: `
        <h3>Merhaba ${name},</h3>
        <p>Talebiniz başarıyla alınmıştır.</p>
        <p>En kısa sürede sizinle iletişime geçeceğiz.</p>
        <br/>
        <strong>Melih Sancar</strong>
      `
    });

    // 📩 SANA GELEN MAIL (BİLDİRİM)
    await resend.emails.send({
      from: "Melih Sancar <info@melihsancar.com>",
      to: "info@melihsancar.com",
      subject: "Yeni müşteri talebi",
      html: `
        <h3>Yeni Talep Geldi</h3>
        <p><strong>İsim:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Detay:</strong> ${details}</p>
      `
    });

    console.log("MAIL SENT FROM:", "info@melihsancar.com");

    res.json({ success: true });

  } catch (error) {
    console.error("MAIL ERROR:", error);
    res.status(500).json({ error: "Mail hatası" });
  }
});


// =====================================================
// 🔥 GET OFFERS
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

// 🔹 Ziyaret artır
app.post("/visit", async (req, res) => {
    try {
        await db.query(`
            UPDATE site_stats
            SET total_visits = total_visits + 1
            WHERE id = 1
        `);

        res.json({ success: true });

    } catch (err) {
        console.error("VISIT ERROR:", err);
        res.status(500).json({ error: "visit error" });
    }
});

// 🔹 Ziyaret sayısı getir
app.get("/visit-count", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT total_visits FROM site_stats LIMIT 1
        `);

        if (!rows.length) {
            return res.json({ count: 0 });
        }

        res.json({ count: rows[0].total_visits });

    } catch (err) {
        console.error("COUNT ERROR:", err);
        res.status(500).json({ error: "count error" });
    }
});


app.post("/visit", async (req, res) => {
    try {
        await db.query(`
            UPDATE site_stats
            SET total_visits = total_visits + 1
            WHERE id = 1
        `);

        res.json({ success: true });

    } catch (err) {
        console.error("VISIT ERROR:", err);
        res.status(500).json({ error: "visit error" });
    }
});

// 🔥 TCMB KUR API
<script>
async function loadMarket() {
    try {
        const res = await fetch("https://ai-server-ewqi.onrender.com/market");
        const data = await res.json();

        document.getElementById("usd").innerText = data.usd.toFixed(2) + " ₺";
        document.getElementById("eur").innerText = data.eur.toFixed(2) + " ₺";

        const goldRes = await fetch("https://api.gold-api.com/price/XAU");
        const goldData = await goldRes.json();

        const gram = goldData.price / 31.1;
        document.getElementById("gold").innerText = gram.toFixed(2) + " $";

    } catch (err) {
        console.error("MARKET ERROR:", err);
    }
}

loadMarket();
</script>