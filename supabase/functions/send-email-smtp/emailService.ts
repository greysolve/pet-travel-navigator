
import { SMTPClient } from "npm:emailjs@4.0.3";
import { EmailRequest, SMTPSettings, SMTPConfig } from "./types.ts";

export async function sendDirectEmail(
  client: SMTPClient, 
  requestData: EmailRequest, 
  fromName: string, 
  fromEmail: string
): Promise<string> {
  console.log(`Sending SMTP email from ${fromName} <${fromEmail}> to ${requestData.to}`);
  
  const message = {
    from: `${fromName} <${fromEmail}>`,
    to: requestData.to,
    subject: requestData.subject,
    text: requestData.html.replace(/<[^>]*>?/gm, ''), // Simple HTML to text conversion
    attachment: [
      { data: requestData.html, alternative: true }
    ]
  };
  
  try {
    const info = await client.sendAsync(message);
    console.log("SMTP email sent:", info);
    return 'smtp-' + Date.now();
  } catch (smtpError) {
    console.error("SMTP sending error:", smtpError);
    throw new Error(`SMTP sending failed: ${smtpError.message}`);
  }
}

export async function sendContactFormEmails(
  client: SMTPClient, 
  requestData: EmailRequest, 
  settings: SMTPSettings, 
  fromName: string, 
  fromEmail: string
): Promise<{supportEmailId: string, userEmailId: string}> {
  console.log("Processing contact form submission via SMTP");
  
  // Ensure auto_reply_template exists
  if (!settings.auto_reply_template) {
    settings.auto_reply_template = "Thank you for contacting us about {{subject}}. We will get back to you soon.";
  }
  
  const autoReplyTemplate = settings.auto_reply_template.replace(
    "{{subject}}", 
    requestData.subject
  );
  
  // Enhanced email content with prominent customer email
  const supportEmailHTML = `
    <p><strong>REPLY DIRECTLY TO THE CUSTOMER AT: ${requestData.email}</strong></p>
    <p>(The customer has been CC'd on this email)</p>
    <hr>
    <p><strong>From:</strong> ${requestData.name} (${requestData.email})</p>
    <p><strong>Subject:</strong> ${requestData.subject}</p>
    <p><strong>Message:</strong></p>
    <p>${requestData.message.replace(/\n/g, '<br>')}</p>
  `;
  
  const userEmailHTML = `
    <p>Dear ${requestData.name},</p>
    <p>${autoReplyTemplate}</p>
    <p>Best regards,<br>The PetJumper Support Team</p>
  `;
  
  // Add CC to the user's email address in addition to the Reply-To header
  const supportEmailMessage = {
    from: `${requestData.name} via PetJumper <${fromEmail}>`,
    to: settings.support_email,
    cc: requestData.email, // Add user as CC recipient
    subject: requestData.subject,
    text: supportEmailHTML.replace(/<[^>]*>?/gm, ''),
    attachment: [
      { data: supportEmailHTML, alternative: true }
    ],
    headers: {
      'Reply-To': requestData.email, // Keep Reply-To header just in case
      'X-Original-From': requestData.email,
      'X-Original-Name': requestData.name
    }
  };
  
  console.log("About to send email with CC and Reply-To:", requestData.email);
  const supportInfo = await client.sendAsync(supportEmailMessage);
  console.log("SMTP support email sent:", supportInfo);
  
  // Send auto-reply to user
  const userEmailMessage = {
    from: `${fromName} <${fromEmail}>`,
    to: requestData.email,
    subject: settings.auto_reply_subject || "Thank you for your message",
    text: userEmailHTML.replace(/<[^>]*>?/gm, ''),
    attachment: [
      { data: userEmailHTML, alternative: true }
    ]
  };
  
  const userInfo = await client.sendAsync(userEmailMessage);
  console.log("SMTP auto-reply email sent:", userInfo);
  
  return {
    supportEmailId: 'smtp-support-' + Date.now(),
    userEmailId: 'smtp-user-' + Date.now()
  };
}
