const router = require("express").Router();
const axios = require("axios");

const MAILTRAP_API_URL = "https://send.api.mailtrap.io/api/send";
const API_TOKEN = process.env["mailtoken"];
const FROM_NAME = "Website Notifications";
const FROM_EMAIL = "wksn75321@gmail.com";
const RECIPIENT_EMAIL = "wksn753@gmail.com";

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
    await sendMail({
      toEmail: RECIPIENT_EMAIL,
      subject,
      text,
      html,
      category: "website-notification",
    });

    res.status(200).send("Email sent successfully.");
  } catch (error) {
    console.error("Mail sending error:", error);
    res.status(500).send("Failed to send email. " + error.message);
  }
});

async function sendMail({ toEmail, subject, text, html, category, attachments }) {
  if (!API_TOKEN) {
    throw new Error("Mailtrap API token is missing in environment variables.");
  }

  const payload = {
    from: { email: FROM_EMAIL, name: FROM_NAME },
    to: [{ email: toEmail }],
    subject,
    text,
    html,
    category,
    ...(attachments && { attachments }),
    cc: [{ email: "wksn753@gmail.com" }],
    reply_to: { email: "wksn753@gmail.com" },
  };

  try {
    const response = await axios.post(MAILTRAP_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Mailtrap API Error:", error.response?.data || error.message);
    throw new Error(
      `Failed to send email: ${
        error.response?.data?.errors?.[0]?.message || error.message
      }`
    );
  }
}

module.exports = router;
