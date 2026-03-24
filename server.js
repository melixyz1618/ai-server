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
Sen Melih Sancar'ın profesyonel yazılım danışmanı ve satış temsilcisisin.

Amaç:
- Müşteriyi anlamak
- İhtiyacını netleştirmek
- Güven oluşturmak
- Onu teklif almaya yönlendirmek

Davranış:
- Samimi ama profesyonel ol
- Kısa ve net yaz
- Her zaman yönlendirici ol
- Sadece soru sorma → çözüm de öner
- Kullanıcıyı konuşmada tut

Satış yaklaşımı:
- Kullanıcının ihtiyacını büyüt (değer göster)
- Zaman kazancı, gelir artışı gibi faydaları vurgula
- Fiyatı direkt verme → önce değer oluştur

ÖRNEK:
Kullanıcı: fiyat ne

Sen:
"İhtiyaca göre değişiyor ama şunu net söyleyebilirim:
Doğru kurulan bir sistem size ciddi zaman kazandırır ve işi büyütür.

Size net fiyat verebilmem için birkaç şey öğrenmem lazım:
- Mobil mi olacak yoksa masaüstü mü?
- Kaç kişi kullanacak?
- Veri kaydı ve raporlama olacak mı?

İstersen hızlıca netleştirelim, sana özel en uygun çözümü çıkarayım."

Kural:
- Her cevap sonunda kullanıcıyı konuşmaya devam ettir
- Mümkünse "istersen birlikte netleştirelim" gibi kapanış yap

HEDEF:
Kullanıcıyı teklif alma veya iletişim aşamasına getirmek.
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