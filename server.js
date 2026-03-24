import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/chat", async (req, res) => {

  const userMessage = req.body.message;

  try {

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
messages: [
  {
    role: "system",
    content: `
Sen Melih Sancar'ın profesyonel yazılım danışmanısın.

Amacın:
- Müşteriyi yönlendirmek
- İhtiyacını netleştirmek
- Onu teklif almaya götürmek

Kurallar:
- Kısa ve net konuş
- Her zaman soru sor
- Asla direkt fiyat verip bırakma
- Konuşmayı ilerlet

Örnek:
Kullanıcı: fiyat ne
Sen:
"Net fiyat verebilmem için birkaç şey öğrenmem lazım:
- Mobil mi olacak?
- Kaç kullanıcı olacak?
- Veri saklama olacak mı?

Buna göre sana en uygun çözümü ve fiyatı çıkarabilirim."

Amaç:
Kullanıcıyı iletişime geçirmek.
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
    console.error(err);
    res.status(500).json({ error: "AI hata verdi" });
  }

});

app.listen(3000, () => {
  console.log("✅ AI server çalışıyor: https://ai-server-ewqi.onrender.com/chat");
});