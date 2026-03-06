require("dotenv").config({ path: __dirname + "/config/.env" });
const nodemailer = require("nodemailer");

async function testEmail() {
  try {
    // إنشاء ترانسبورتر باستخدام إعدادات .env
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === "true", // false للـ TLS العادي
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // إعداد الإيميل
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: "ahmedloby8@gmail.com", // جرب الإيميل بتاعك أو أي إيميل ليك
      subject: "UAPMP Test Email ✅",
      html: `<h2>Testing email from UAPMP backend</h2>
             <p>If you receive this, your email config works!</p>`,
    });

    console.log("Email sent successfully!");
    console.log("Message ID:", info.messageId);
  } catch (err) {
    console.error("Failed to send email:", err.message);
  }
}

testEmail();
