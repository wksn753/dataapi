const router = require("express").Router();
const nodemailer = require("nodemailer");

const FROM_NAME = "Website Notifications";
const FROM_EMAIL = "wksn753@gmail.com"; // Your Gmail
const TO_EMAIL = "wksn75321@gmail.com"; // Recipient
const GMAIL_APP_PASSWORD = "ksqy pwfz zwet xfrj"; // Your App Password

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // use SSL
  auth: {
    user: FROM_EMAIL,
    pass: GMAIL_APP_PASSWORD,
  },
});

router.get("/", async (req, res) => {
  res.send("Mail route active");
});

router.post("/sendWPMail", async (req, res) => {
  const { email, name } = req.body;

  if (!email || !name) {
    return res.status(400).send("Email and username are required.");
  }

  const subject = "🆕 New Website Subscription Alert";

  const text = `
Hello,

You have a new subscriber on your website!

👤 Name: ${name}
📧 Email: ${email}

They’ve just signed up to stay updated.

Best,
Your Website Team
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
      <h2>🚀 New Website Subscription</h2>
      <p>Hello,</p>
      <p>You have a new subscriber on your website!</p>
      <ul>
        <li><strong>Name:</strong> ${name}</li>
        <li><strong>Email:</strong> ${email}</li>
      </ul>
      <p>They’ve just signed up to stay updated with your latest content or offers.</p>
      <p>Best,<br>Your Website Team</p>
    </div>
  `;

  try {
    await sendMail({ toEmail: TO_EMAIL, subject, text, html });
    res.status(200).send("Email sent successfully.");
  } catch (error) {
    console.error("Mail sending error:", error);
    res.status(500).send("Failed to send email. " + error.message);
  }
});

async function sendMail({ toEmail, subject, text, html }) {
  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: toEmail,
    subject,
    text,
    html,
  };

  // Send mail
  const info = await transporter.sendMail(mailOptions);
  console.log("Email sent:", info.messageId);
  return info;
}

module.exports = router;
