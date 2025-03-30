
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "npm:emailjs@4.0.3";
import { EmailRequest } from "./types.ts";
import { corsHeaders, configureSmtpClient } from "./config.ts";
import { fetchSmtpSettings } from "./settingsService.ts";
import { sendDirectEmail, sendContactFormEmails } from "./emailService.ts";

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: EmailRequest = await req.json();
    console.log("SMTP email request data:", requestData);

    // Get support settings from database for SMTP configuration
    const settings = await fetchSmtpSettings();
    const smtpConfig = configureSmtpClient(settings);
    
    try {
      const client = new SMTPClient(smtpConfig);
      
      const fromName = settings.smtp_from_name || "PetJumper Support";
      const fromEmail = settings.smtp_from_email || settings.smtp_username;
      
      // For direct email sending (admin features)
      if (requestData.to && requestData.subject && requestData.html) {
        const emailId = await sendDirectEmail(client, requestData, fromName, fromEmail);
        
        return new Response(
          JSON.stringify({ id: emailId, message: 'Email sent via SMTP' }), 
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      } 
      // For contact form submissions
      else if (requestData.name && requestData.email && requestData.subject && requestData.message) {
        const emailIds = await sendContactFormEmails(client, requestData, settings, fromName, fromEmail);
        
        return new Response(
          JSON.stringify({ 
            message: "Contact form processed successfully via SMTP", 
            supportEmail: { id: emailIds.supportEmailId },
            userEmail: { id: emailIds.userEmailId }
          }), 
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      } else {
        throw new Error("Invalid request data for SMTP email");
      }
    } catch (smtpSetupError) {
      console.error("SMTP client setup or sending error:", smtpSetupError);
      throw new Error(`SMTP configuration error: ${smtpSetupError.message}`);
    }
  } catch (error: any) {
    console.error("Error in send-email-smtp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
