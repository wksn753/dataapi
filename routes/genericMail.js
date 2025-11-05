const router = require("express").Router();
const { MailtrapClient } =require("mailtrap");

const TOKEN = process.env["mailtoken"];
const SENDER_EMAIL = "wksn75321@gmail.com";
const RECIPIENT_EMAIL = "wksn753@gmail.com";

const client = new MailtrapClient({ token: TOKEN });
const sender = { name: "Website Notifications", email: SENDER_EMAIL };

router.get("/", async (req, res) => {
  res.send("Mail route active");
});

router.post("/sendWPMail", async (req, res) => {
  const { email, name } = req.body;

  if (!email || !name) {
    return res.status(400).send("Email and username are required.");
  }

  try {
    await client.send({
      from: sender,
      to: [{ email: RECIPIENT_EMAIL }],
      subject: "🆕 New Website Subscription Alert",
      text: `
Hello,

You have a new subscriber on your website!

👤 Name: ${name}
📧 Email: ${email}

They’ve just signed up to stay updated.

Best,
Your Website Team
      `.trim(),
      html: `
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
      `,
    });

    res.status(200).send("Email sent successfully.");
  } catch (error) {
    console.error("Mail sending error:", error);
    res.status(500).send("Failed to send email. "+error+" "+process.env["mailtoken"]);
  }
});

module.exports = router;
