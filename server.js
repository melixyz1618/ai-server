import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";
import { Resend } from "resend";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 🔹 OpenAI Client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// =====================================================
// 🔥 CHAT ENDPOINT
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
          content: `
Sen Melih Sancar'ın profesyonel yazılım danışmanı ve satış temsilcisisin.

Amacın:
- Müşteriyi anlamak
- İhtiyacını netleştirmek
- Güven oluşturmak
- Onu teklif almaya yönlendirmek

Davranış:
- Samimi ama profesyonel ol
- Kısa ve net yaz
- Sadece soru sorma → çözüm öner
- Her cevapta kullanıcıyı yönlendir
- Konuşmayı asla boşta bırakma

Satış stratejisi:
1. İhtiyacı anlamaya çalış
2. Çözüm öner
3. Değer anlat
4. Aksiyona yönlendir

Kural:
Her cevap sonunda mutlaka aksiyon çağrısı yap.
`
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
    res.status(500).json({
      error: "AI hata verdi",
      detail: err.message
    });
  }
});

// =====================================================
// 🔥 OFFER ENDPOINT
// =====================================================
app.post("/offer", (req, res) => {
  const data = req.body;

  if (!data.name || !data.phone) {
    return res.status(400).json({
      error: "Ad ve telefon zorunlu"
    });
  }

  let offers = [];

  if (fs.existsSync("offers.json")) {
    try {
      offers = JSON.parse(fs.readFileSync("offers.json", "utf-8"));
    } catch (err) {
      console.error("JSON parse hatası:", err.message);
      offers = [];
    }
  }

  const newOffer = {
    ...data,
    createdAt: new Date().toISOString()
  };

  offers.push(newOffer);

  try {
    fs.writeFileSync("offers.json", JSON.stringify(offers, null, 2));
  } catch (err) {
    console.error("Dosya yazma hatası:", err.message);
    return res.status(500).json({ error: "Kayıt başarısız" });
  }

  res.json({
    success: true,
    message: "Teklif kaydedildi"
  });
});

// =====================================================
// 🔥 MAIL ENDPOINT (ÇİFT GÖNDERİM)
// =====================================================
app.post("/send-mail", async (req, res) => {

  const { email, name, details } = req.body;

  try {

    // ✅ 1. Müşteriye mail
    await resend.emails.send({
      from: "Melih Sancar <info@melihsancar.com>",
      to: email,
      subject: "Teklif Talebiniz Alındı",
      html: `
        <div style="font-family:sans-serif">
          <h2>Merhaba ${name} 👋</h2>
          <p>Talebiniz bize ulaştı.</p>
          <p><b>Detay:</b> ${details}</p>
        </div>
      `
    });

    // ✅ 2. Sana bildirim maili
    await resend.emails.send({
      from: "Melih Sancar <info@melihsancar.com>",
      to: "info@melihsancar.com",
      subject: "Yeni Teklif Talebi 🚀",
      html: `
        <div style="font-family:sans-serif">
          <h3>Yeni müşteri talebi</h3>
          <p><b>İsim:</b> ${name}</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Detay:</b> ${details}</p>
        </div>
      `
    });

    res.json({ success: true });

  } catch (error) {
    console.error("MAIL ERROR:", error);
    res.status(500).json({ error: "Mail gönderilemedi" });
  }

});

// =====================================================
// 🔥 GET OFFERS
// =====================================================
app.get("/offers", (req, res) => {

  if (!fs.existsSync("offers.json")) {
    return res.json([]);
  }

  try {
    const data = JSON.parse(fs.readFileSync("offers.json", "utf-8"));
    res.json(data);
  } catch {
    res.json([]);
  }

});

// =====================================================
// 🔥 HEALTH CHECK
// =====================================================
app.get("/", (req, res) => {
  res.send("Server çalışıyor 🚀");
});

// =====================================================
// 🚀 SERVER START
// =====================================================
app.listen(PORT, () => {
  console.log(`Server çalışıyor: http://localhost:${PORT}`);
});