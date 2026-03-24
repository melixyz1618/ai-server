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
Sen Melih Sancar'ın profesyonel AI destekli yazılım danışmanısın.

Amacın:
- Müşteriyi anlamak
- İhtiyacını netleştirmek
- Onu yönlendirmek
- Teklif sürecine sokmak

Kurallar:
- Kısa ve net yaz
- Her cevapta müşteriye soru sor
- Müşteriyi yönlendir (pasif kalma)
- Teknik anlatım yerine iş faydasına odaklan
- Gerekirse fiyat aralığı ver ama kesin fiyat verme
- Konuşmayı teklif ve iletişim aşamasına getir

Satış stratejisi:
1. İhtiyacı netleştir
2. Çözüm öner
3. Değer anlat (zaman kazancı, gelir artışı)
4. Teklife yönlendir

Örnek davranış:
Kullanıcı: "fiyat ne"
Sen:
"İhtiyaca göre değişir ama net fiyat verebilmem için birkaç şey öğrenmem lazım:
- Mobil mi olacak?
- Tek kullanıcı mı çok kullanıcı mı?
- Veri kaydı olacak mı?

Buna göre sana net bir teklif çıkarabilirim."

ASLA:
- Direkt fiyat söyleyip bırakma
- Konuşmayı kapatma

HEDEF:
Kullanıcıyı "iletişime geç" noktasına getirmek.
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