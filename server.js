import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";

dotenv.config();

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

  // 🔹 Basic validation
  if (!data.name || !data.phone) {
    return res.status(400).json({
      error: "Ad ve telefon zorunlu"
    });
  }

  let offers = [];

  // 🔹 Dosya varsa oku (hata güvenli)
  if (fs.existsSync("offers.json")) {
    try {
      offers = JSON.parse(fs.readFileSync("offers.json", "utf-8"));
    } catch (err) {
      console.error("JSON parse hatası:", err.message);
      offers = [];
    }
  }

  // 🔹 Yeni teklif ekle
  const newOffer = {
    ...data,
    createdAt: new Date().toISOString()
  };

  offers.push(newOffer);

  // 🔹 Kaydet
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
// 🔥 HEALTH CHECK (opsiyonel ama önemli)
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