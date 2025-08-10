import nodemailer from "nodemailer";
import { APP_EMAIL } from "../constants.js";

export const sendEmail = async function (to, subject, text, html) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: APP_EMAIL,
        pass: process.env.GOOGLE_APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"Fortissimo" <${APP_EMAIL}>`,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);

    return info;
  } catch (error) {
    console.log("Failed to send mail!", error);
    throw error;
  }
};
