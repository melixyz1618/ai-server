import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { Resend } from "resend";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";

const ADMIN_SECRET = "OY5G25ZSMFGXGMTJKZQU63R6EQRSGKLYIR3FOQL2HBIFWOCIHFAQ";
const JWT_SECRET = "super-secret-key";



function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(403).json({ error: "No token" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (!decoded.admin) {
            return res.status(403).json({ error: "Not admin" });
        }

        next();

    } catch {
        return res.status(403).json({ error: "Invalid token" });
    }
}

async function checkBlockedIP(req, res, next) {
    const ip =
        (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
        req.socket.remoteAddress ||
        req.ip;

    const [rows] = await db.execute(
        "SELECT * FROM blocked_ips WHERE ip = ?",
        [ip]
    );

    if (rows.length > 0) {
        return res.status(403).send("Blocked");
    }

    next();
}

dotenv.config();

// =====================================================
// 🔹 DB CONNECTION
// =====================================================
const db = await mysql.createPool(process.env.DATABASE_URL);

// =====================================================
// 🔹 SERVICES
// =====================================================
const resend = new Resend(process.env.RESEND_API_KEY);

const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

// =====================================================
// 🔹 APP INIT
// =====================================================
const app = express();
app.use(cors());
app.use(express.json());

app.post("/admin-login", (req, res) => {
    const { token } = req.body;

    const verified = speakeasy.totp({
        secret: ADMIN_SECRET,
        encoding: "base32",
        token
    });

    if (!verified) {
        return res.status(401).json({ success: false });
    }

    const jwtToken = jwt.sign({ admin: true }, JWT_SECRET, {
        expiresIn: "2h"
    });

    res.json({ success: true, token: jwtToken });
});

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
          content: `
Sen Melih Sancar'ın kişisel web sitesinde çalışan bir AI asistansın.

Kimlik:
- Bu site Melih Sancar'a aittir
- Melih Sancar yazılım geliştirici, maker ve sistem tasarımcısıdır
- Mobil uygulama, AI sistemleri ve otomasyon çözümleri geliştirir

Görevin:
- Kullanıcıyı doğru yönlendirmek
- Sorulara net cevap vermek
- Gerekirse teklif sürecine yönlendirmek

Davranış:
- Kendini bu sitenin asistanı olarak konumlandır
- Site sahibi sorulursa: Melih Sancar de
- "Bilmiyorum" deme, yönlendir
- Kısa, net ve güven veren cevaplar ver
- Satış odaklı düşün

Önemli:
- Kullanıcı proje isterse bilgi toplamaya başla
- Gerekirse teklif almaya yönlendir

Projeler:
- PaxLoto (loto uygulaması)
- PaxSpin (slot oyunu mobil uygulaması)
- Pasteur AI (yapay zeka destekli veteriner platformu)

Hizmetler:
- Mobil uygulama geliştirme
- Web yazılım
- AI sistemler

Cevap formatı:
- Maksimum 5-6 satır
- Önce sonuç ver
- Sonra teklif kapat
- Teknik detaylara girme

Kural:
- Her konuşmanın sonunda kullanıcıdan isim ve telefon iste
- Ama bunu doğal şekilde yap

Eğer kullanıcı proje anlatıyorsa:
- Net fiyat aralığı ver
- Süre ver
- Sonra şu cümleyi kur:
"İstersen hemen başlayalım, adını ve telefonunu yaz, seni arayalım."

- Her mesajda telefon isteme
- Sadece kullanıcı hazır olduğunda iletişim iste
- Fiyat çelişkisi yaratma
- Önce MVP sonra gelişmiş paket sun
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

    // 🔥 DUPLICATE KONTROL (30 saniye)
    const [rows] = await db.execute(`
      SELECT * FROM offers 
      WHERE phone = ? 
      AND created_at > NOW() - INTERVAL 30 SECOND
    `, [phone]);

    if (rows.length > 0) {
      return res.json({ 
        success: false, 
        message: "Çok hızlı tekrar gönderim" 
      });
    }
	
// 🔥 SON ID AL
const [last] = await db.execute(
  "SELECT id FROM offers ORDER BY id DESC LIMIT 1"
);

const nextId = last.length ? last[0].id + 1 : 1;

// 🎯 OFFER NO
const year = new Date().getFullYear();
const offerNo = `TLP-${year}-${String(nextId).padStart(5,"0")}`;
    // 🔥 INSERT
    await db.execute(
		`INSERT INTO offers 
		(name, email, phone, project_type, details, offer_no)
		VALUES (?, ?, ?, ?, ?, ?)`,
		[name, email, phone, projectType, details, offerNo]
	);

    res.json({ success: true, offerNo });

  } catch (err) {
    console.error("DB ERROR:", err);
    res.status(500).json({ error: "DB error" });
  }
});


// =====================================================
// 🔥 MAIL
// =====================================================
app.post("/send-mail", async (req, res) => {
  const { email, name, details, offerNo } = req.body;

  try {

    // 📩 MÜŞTERİYE GİDEN MAIL
    await resend.emails.send({
      from: "Melih Sancar <info@melihsancar.com>",
      to: email,
      subject: "Talebiniz alındı",
      html: `
        <h3>Merhaba ${name},</h3>
        <p>Talebiniz başarıyla alınmıştır.</p>
        
        <p style="font-size:16px;">
          <strong>Talep Numaranız:</strong> ${offerNo}
        </p>

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
        <p><strong>Talep No:</strong> ${offerNo}</p>
        <p><strong>İsim:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Detay:</strong> ${details}</p>
      `
    });

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

// 🔥 TCMB KUR API
app.get("/market", async (req, res) => {
    try {
        const response = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml");
        const xml = await response.text();

        const usd = xml.match(/CurrencyCode="USD"[\s\S]*?<ForexSelling>(.*?)<\/ForexSelling>/)[1];
        const eur = xml.match(/CurrencyCode="EUR"[\s\S]*?<ForexSelling>(.*?)<\/ForexSelling>/)[1];

        res.json({
            usd: parseFloat(usd),
            eur: parseFloat(eur)
        });

    } catch (err) {
        console.error("TCMB ERROR:", err);
        res.status(500).json({ error: "Kur alınamadı" });
    }
});

// 🔥 DELETE OFFER
app.delete("/offers/:id", authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;

        await db.execute("DELETE FROM offers WHERE id = ?", [id]);

        res.json({ success: true });

    } catch (err) {
        console.error("DELETE ERROR:", err);
        res.status(500).json({ error: "delete error" });
    }
});


// 🔥 STATUS UPDATE (tamamlandı vs)
app.put("/offers/:id", authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const { status } = req.body;

        await db.execute(
            "UPDATE offers SET status = ? WHERE id = ?",
            [status, id]
        );

        res.json({ success: true });

    } catch (err) {
        console.error("UPDATE ERROR:", err);
        res.status(500).json({ error: "update error" });
    }
});

app.post("/track-visit", checkBlockedIP, async (req, res) => {
    try {
        const { uid } = req.body;
		if (!uid) {
			return res.status(400).json({ error: "uid boş olamaz" });
        }
        const ip =
            (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
            req.socket.remoteAddress ||
            req.ip;

        const userAgent = req.headers['user-agent'];

        let browser = "Unknown";
        if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) browser = "Chrome";
        else if (userAgent.includes("Firefox")) browser = "Firefox";
        else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari";

        let device = "Desktop";
        if (/mobile/i.test(userAgent)) device = "Mobile";

        let country = "Unknown";
        let city = "Unknown";

        try {
            const geo = await fetch(`http://ip-api.com/json/${ip}`);
            const geoData = await geo.json();
            country = geoData.country;
            city = geoData.city;
        } catch {}

        await db.execute(`
            INSERT INTO visitors (uid, ip, user_agent, browser, device, country, city, last_seen)
			VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
			ON DUPLICATE KEY UPDATE last_seen = NOW()
		`, [uid, ip, userAgent, browser, device, country, city]);

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "track error" });
    }
});

// 🔥 günlük ziyaret
app.get("/stats/daily", authMiddleware, async (req, res) => {
    const [rows] = await db.execute(`
        SELECT DATE(created_at) as date, COUNT(*) as total
        FROM visitors
        GROUP BY DATE(created_at)
        ORDER BY date ASC
        LIMIT 7
    `);
    res.json(rows);
});

// 🔥 browser dağılım
app.get("/stats/browser", authMiddleware, async (req, res) => {
    const [rows] = await db.execute(`
        SELECT browser, COUNT(*) as total
        FROM visitors
        GROUP BY browser
    `);
    res.json(rows);
});

// 🔥 ülke
app.get("/stats/country", authMiddleware, async (req, res) => {
    const [rows] = await db.execute(`
        SELECT country, COUNT(*) as total
        FROM visitors
        GROUP BY country
    `);
    res.json(rows);
});

let onlineUsers = 0;

app.post("/online", (req, res) => {
    onlineUsers++;
    res.json({ online: onlineUsers });
});

app.get("/online", (req, res) => {
    res.json({ online: onlineUsers });
});

app.get("/stats/city", authMiddleware, async (req, res) => {
    const [rows] = await db.execute(`
        SELECT city, COUNT(*) as total
        FROM visitors
        GROUP BY city
        ORDER BY total DESC
        LIMIT 10
    `);
    res.json(rows);
});

app.get("/stats/online", async (req, res) => {
    const [rows] = await db.execute(`
        SELECT COUNT(DISTINCT uid) as total
        FROM visitors
        WHERE last_seen > NOW() - INTERVAL 30 SECOND
    `);

    res.json(rows[0]);
});

app.get("/stats/recent", authMiddleware, async (req, res) => {
    const [rows] = await db.execute(`
        SELECT 
            uid,
            ip,
            browser,
            city,
            country,
            created_at,
            last_seen
        FROM visitors
        ORDER BY last_seen DESC
        LIMIT 20
    `);

    res.json(rows);
});

app.post("/heartbeat", async (req, res) => {
    try {
        const { uid } = req.body;

        if (!uid) {
            return res.status(400).json({ error: "uid boş" });
        }

        await db.execute(`
            UPDATE visitors
            SET last_seen = NOW()
            WHERE uid = ?
        `, [uid]);

        res.json({ success: true });

    } catch (err) {
        console.error("heartbeat error:", err);
        res.status(500).json({ error: "heartbeat error" });
    }
});
// 🧹 TÜM VERİYİ SİL
app.delete("/admin/clear-stats", authMiddleware, async (req, res) => {
    await pool.query("DELETE FROM visitors");
    res.json({ success: true });
});

// 🚫 IP ENGELLE
app.post("/admin/block-ip", authMiddleware, async (req, res) => {
    const { ip } = req.body;
    await pool.query("INSERT INTO blocked_ips(ip) VALUES($1)", [ip]);
    res.json({ success: true });
});