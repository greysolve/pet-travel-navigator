
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { SMTPClient } from "npm:emailjs@4.0.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to?: string;
  subject?: string;
  html?: string;
  name?: string;
  email?: string;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: EmailRequest = await req.json();
    console.log("Email request data:", requestData);

    // Get support settings from database to determine email sending method
    const { data: settingsData, error: settingsError } = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/rest/v1/support_settings?limit=1`,
      {
        headers: {
          "Content-Type": "application/json",
          "apikey": Deno.env.get("SUPABASE_ANON_KEY") || "",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
        }
      }
    ).then(res => res.json());

    if (settingsError) {
      console.error("Error fetching support settings:", settingsError);
      throw new Error("Failed to fetch support settings");
    }

    const settings = settingsData && settingsData.length > 0 ? settingsData[0] : {
      support_email: "hello@support.petjumper.com",
      auto_reply_subject: "Your message has been received",
      auto_reply_template: "Thank you for contacting PetJumper support. We have received your message and will respond as soon as possible. Your request has been logged with the subject: {{subject}}.",
      use_smtp: false
    };

    // For direct email sending (admin features)
    if (requestData.to && requestData.subject && requestData.html) {
      console.log("Sending email to:", requestData.to);
      
      let emailResponse;
      
      if (settings.use_smtp && settings.smtp_host && settings.smtp_username && settings.smtp_password) {
        // Use SMTP
        emailResponse = await sendEmailSMTP({
          to: requestData.to,
          subject: requestData.subject,
          html: requestData.html,
          settings
        });
      } else {
        // Use Resend
        emailResponse = await resend.emails.send({
          from: "PetTravel <onboarding@resend.dev>",
          to: [requestData.to],
          subject: requestData.subject,
          html: requestData.html,
        });
      }

      console.log("Email sent successfully:", emailResponse);

      return new Response(JSON.stringify(emailResponse), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    } 
    // For contact form submissions
    else if (requestData.name && requestData.email && requestData.subject && requestData.message) {
      console.log("Processing contact form submission");
      
      const autoReplyTemplate = settings.auto_reply_template.replace(
        "{{subject}}", 
        requestData.subject
      );

      let supportEmailResponse, userEmailResponse;
      
      // Prepare email content
      const supportEmailHTML = `
        <h2>New Contact Form Submission</h2>
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

      if (settings.use_smtp && settings.smtp_host && settings.smtp_username && settings.smtp_password) {
        // Send emails using SMTP
        console.log("Using SMTP to send emails");
        
        // Send to support
        supportEmailResponse = await sendEmailSMTP({
          to: settings.support_email,
          subject: `Contact Form: ${requestData.subject}`,
          html: supportEmailHTML,
          settings
        });
        
        // Send auto-reply to user
        userEmailResponse = await sendEmailSMTP({
          to: requestData.email,
          subject: settings.auto_reply_subject,
          html: userEmailHTML,
          settings
        });
      } else {
        // Send emails using Resend
        console.log("Using Resend to send emails");
        
        // Send to support
        supportEmailResponse = await resend.emails.send({
          from: "PetJumper Contact <onboarding@resend.dev>",
          to: [settings.support_email],
          subject: `Contact Form: ${requestData.subject}`,
          html: supportEmailHTML,
        });
        
        // Send auto-reply to user
        userEmailResponse = await resend.emails.send({
          from: "PetJumper Support <onboarding@resend.dev>",
          to: [requestData.email],
          subject: settings.auto_reply_subject,
          html: userEmailHTML,
        });
      }

      console.log("Support email sent:", supportEmailResponse);
      console.log("Auto-reply email sent:", userEmailResponse);

      return new Response(
        JSON.stringify({ 
          message: "Contact form processed successfully", 
          supportEmail: supportEmailResponse,
          userEmail: userEmailResponse 
        }), 
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else {
      throw new Error("Invalid request data");
    }
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

// Helper function to send emails via SMTP
async function sendEmailSMTP({
  to,
  subject,
  html,
  settings
}: {
  to: string;
  subject: string;
  html: string;
  settings: any;
}) {
  console.log(`Setting up SMTP client for ${settings.smtp_host}:${settings.smtp_port}`);
  
  const client = new SMTPClient({
    user: settings.smtp_username,
    password: settings.smtp_password,
    host: settings.smtp_host,
    port: settings.smtp_port,
    ssl: settings.smtp_secure,
    tls: !settings.smtp_secure,
  });
  
  try {
    const fromName = settings.smtp_from_name || "PetJumper Support";
    const fromEmail = settings.smtp_from_email || settings.smtp_username;
    
    console.log(`Sending email from ${fromName} <${fromEmail}> to ${to}`);
    
    const message = {
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      text: html.replace(/<[^>]*>?/gm, ''), // Simple HTML to text conversion
      attachment: [
        { data: html, alternative: true }
      ]
    };
    
    const info = await client.sendAsync(message);
    console.log("SMTP email sent:", info);
    return { id: 'smtp-' + Date.now(), message: 'Email sent via SMTP' };
  } catch (error) {
    console.error("SMTP error:", error);
    throw new Error(`SMTP sending failed: ${error.message}`);
  }
}

serve(handler);
