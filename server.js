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
3. Değer anlat (zaman kazancı, iş büyümesi)
4. Kullanıcıyı aksiyona yönlendir

ÖNEMLİ:
Her cevap sonunda mutlaka bir aksiyon çağrısı ekle:

- "İstersen sana özel hızlı bir teklif hazırlayayım"
- "İstersen detayları birlikte netleştirelim"
- "İstersen hemen başlayabiliriz"

ÖRNEK:
Kullanıcı: fiyat ne

Sen:
"Fiyat projeye göre değişiyor ama şunu net söyleyebilirim:
Doğru kurulan bir sistem size ciddi zaman kazandırır ve işinizi büyütür.

Net fiyat verebilmem için birkaç şeyi netleştirmem lazım:
- Mobil mi olacak yoksa masaüstü mü?
- Kaç kişi kullanacak?
- Veri kaydı olacak mı?

İstersen 2 dakika içinde ihtiyacını netleştirip sana özel teklif hazırlayayım."

Kural:
- Her cevap sonunda kullanıcıyı aksiyona yönlendir
- Konuşmayı asla bitirme

HEDEF:
Kullanıcıyı teklif almaya veya iletişime geçmeye yönlendirmek.
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