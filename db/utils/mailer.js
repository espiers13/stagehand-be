const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendPasswordResetEmail = (email, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  return resend.emails.send({
    from: "Stage Hand <noreply@yourdomain.com>",
    to: [email],
    subject: "Reset your Stage Hand password",
    text: `You requested a password reset. Click the link below to set a new password. This link expires in 1 hour.\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
    html: `<p>You requested a password reset. Click the link below to set a new password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
  });
};
