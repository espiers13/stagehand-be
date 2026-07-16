const { Resend } = require("resend");
const jwt = require("jsonwebtoken");

const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendPasswordResetEmail = (email, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  return resend.emails.send({
    from: "Stage Hand <noreply@myfringeplanner.co.uk>",
    to: [email],
    subject: "Reset your Stage Hand password",
    text: `You requested a password reset. Click the link below to set a new password. This link expires in 1 hour.\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
    html: `<p>You requested a password reset. Click the link below to set a new password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
  });
};

exports.sendExistingMemberAddedEmail = (email, productionTitle) => {
  return resend.emails.send({
    from: `Stage Hand <noreply@myfringeplanner.co.uk>`,
    to: [email],
    subject: `You've been added to ${productionTitle}`,
    html: `
      <p>Hi,</p>
      <p>You've been added as a company member on <strong>${productionTitle}</strong>.</p>
      <p>Log in to Stage Hand to see your rehearsal schedule.</p>
    `,
  });
};

exports.sendNewMemberInviteEmail = (email, userId, productionTitle) => {
  const resetToken = jwt.sign({ user_id: userId }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  return resend.emails.send({
    from: `Stage Hand <noreply@myfringeplanner.co.uk>`,
    to: [email],
    subject: `You've been added to ${productionTitle}`,
    html: `
      <p>Hi,</p>
      <p>You've been added as a company member on <strong>${productionTitle}</strong>. An account has been created for you.</p>
      <p>Click below to set your password before logging in. This link expires in 1 hour.</p>
      <a href="${resetLink}">${resetLink}</a>
    `,
  });
};

exports.sendRehearsalNotificationEmail = (
  emails,
  rehearsal,
  productionTitle,
  changeType,
) => {
  if (emails.length === 0) return Promise.resolve();

  return resend.emails.send({
    from: `Stage Hand <noreply@myfringeplanner.co.uk>`,
    to: emails,
    subject: `Rehearsal ${changeType} — ${productionTitle}`,
    html: `
      <p>Hi,</p>
      <p>A rehearsal has been ${changeType} for <strong>${productionTitle}</strong>:</p>
      <ul>
        <li>Date: ${rehearsal.date}</li>
        <li>Time: ${rehearsal.start_time} - ${rehearsal.end_time}</li>
        <li>Location: ${rehearsal.location}</li>
        ${rehearsal.notes ? `<li>Notes: ${rehearsal.notes}</li>` : ""}
        ${rehearsal.scenes && rehearsal.scenes.length > 0 ? `<li>Scenes: ${rehearsal.scenes.join(", ")}</li>` : ""}
      </ul>
    `,
  });
};
