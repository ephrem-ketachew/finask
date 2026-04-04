import nodemailer from 'nodemailer';
import pug from 'pug';
import juice from 'juice';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sendEmail = async (options) => {
  let transporter;

  if (process.env.NODE_ENV === 'production') {
    transporter = nodemailer.createTransport({
      host: process.env.BREVO_HOST,
      port: process.env.BREVO_PORT,
      secure: process.env.BREVO_PORT === '465',
      auth: {
        user: process.env.BREVO_USER,
        pass: process.env.BREVO_PASSWORD,
      },
    });
  } else {
    transporter = nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST,
      port: process.env.MAILTRAP_PORT,
      auth: {
        user: process.env.MAILTRAP_USERNAME,
        pass: process.env.MAILTRAP_PASSWORD,
      },
    });
  }

  const unstyledHtml = pug.renderFile(
    path.join(__dirname, `../views/emails/${options.template}.pug`),
    options
  );

  const html = juice(unstyledHtml);

  const mailOptions = {
    from: `Finask Support <${process.env.EMAIL_FROM}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: html,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('[Email Error]', error.message);
    throw error;
  }
};

export default sendEmail;
