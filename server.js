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
Sen Melih'in AI satış asistanısın.
Kısa, net ve satış odaklı cevap ver.
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
  console.log("✅ AI server çalışıyor: http://localhost:3000");
});