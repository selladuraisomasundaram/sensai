import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

const DEVELOPER_TARGET_EMAIL = 'friendzforum69@gmail.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const feedbackType = body?.type?.trim() || 'General Feedback';
    const message = body?.message?.trim();
    const userEmail = body?.userEmail?.trim() || 'Anonymous Operative';
    const userId = body?.userId?.trim() || 'Unauthenticated';

    if (!message || message.length < 5) {
      return NextResponse.json(
        { error: 'Transmission payload too short. Please provide a detailed message.' },
        { status: 400 }
      );
    }

    if (message.length > 3000) {
      return NextResponse.json(
        { error: 'Transmission payload exceeds length limit (3000 characters).' },
        { status: 400 }
      );
    }

    const timestamp = new Date().toUTCString();
    const subject = `[Sensai ${feedbackType}] New submission from ${userEmail}`;

    const textContent = `
===================================================
SENSAI DEVELOPER DISPATCH / TRANSMISSION
===================================================
Type:       ${feedbackType}
Sender:     ${userEmail}
User ID:    ${userId}
Timestamp:  ${timestamp}
===================================================

TRANSMISSION CONTENT:
${message}

===================================================
`;

    const htmlContent = `
<div style="font-family: monospace; background-color: #09090b; color: #f4f4f5; padding: 24px; border: 1px solid #27272a;">
  <h2 style="color: #ffffff; border-bottom: 1px solid #3f3f46; padding-bottom: 8px; margin-top: 0;">
    [SENSAI DISPATCH] ${feedbackType}
  </h2>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px;">
    <tr><td style="color: #71717a; padding: 4px 0;">Sender:</td><td style="color: #e4e4e7;">${userEmail}</td></tr>
    <tr><td style="color: #71717a; padding: 4px 0;">User ID:</td><td style="color: #e4e4e7;">${userId}</td></tr>
    <tr><td style="color: #71717a; padding: 4px 0;">Timestamp:</td><td style="color: #e4e4e7;">${timestamp}</td></tr>
  </table>
  <div style="background-color: #18181b; border: 1px solid #27272a; padding: 16px; white-space: pre-wrap; color: #fafafa; font-size: 14px; line-height: 1.5;">
${message}
  </div>
</div>
`;

    // Strategy 1: Resend API (if configured)
    if (process.env.RESEND_API_KEY) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'Sensai Messenger <onboarding@resend.dev>',
          to: [DEVELOPER_TARGET_EMAIL],
          reply_to: userEmail.includes('@') ? userEmail : undefined,
          subject,
          text: textContent,
          html: htmlContent,
        }),
      });

      if (!resendRes.ok) {
        const errorText = await resendRes.text();
        throw new Error(`Resend dispatch error: ${errorText}`);
      }

      return NextResponse.json({ success: true, channel: 'resend' });
    }

    // Strategy 2: Nodemailer SMTP Relay (Gmail or custom SMTP)
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.SMTP_PORT || 465);

    if (smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"Sensai Dispatch" <${smtpUser}>`,
        to: DEVELOPER_TARGET_EMAIL,
        replyTo: userEmail.includes('@') ? userEmail : undefined,
        subject,
        text: textContent,
        html: htmlContent,
      });

      return NextResponse.json({ success: true, channel: 'smtp' });
    }

    // Fallback for Local Dev without configured SMTP credentials
    console.warn(
      '[DEV NOTICE]: SMTP/Resend credentials not detected in .env.local. Simulating transmission to:',
      DEVELOPER_TARGET_EMAIL,
      { subject, userEmail, message }
    );

    return NextResponse.json({
      success: true,
      channel: 'simulated_dev',
      notice: 'Credentials pending in .env.local. Transmission logged to console.',
    });
  } catch (err: any) {
    console.error('Feedback dispatch exception:', err);
    return NextResponse.json(
      { error: err.message || 'Transmission failed. Try again later.' },
      { status: 500 }
    );
  }
}

