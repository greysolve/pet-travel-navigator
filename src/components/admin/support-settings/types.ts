
import { z } from "zod";

// Define email security types for the dropdown
export type SmtpSecurityType = "tls" | "ssl" | "none";

export const supportSettingsSchema = z.object({
  support_email: z.string().email({ message: "Please enter a valid email address." }),
  auto_reply_subject: z.string().min(1, { message: "Subject line is required." }),
  auto_reply_template: z.string().min(10, { message: "Template must be at least 10 characters." }),
  use_smtp: z.boolean().default(false),
  smtp_host: z.string().optional(),
  smtp_port: z.number().int().positive().optional(),
  smtp_username: z.string().optional(),
  smtp_password: z.string().optional(),
  smtp_from_email: z.string().email().optional(),
  smtp_from_name: z.string().optional(),
  smtp_security: z.enum(["tls", "ssl", "none"]).default("tls")
});

export type SupportSettingsValues = z.infer<typeof supportSettingsSchema>;

// Common SMTP providers configuration
export const emailProviders = [
  { 
    name: "Rackspace", 
    host: "secure.emailsrvr.com",
    ports: { tls: 587, ssl: 465 },
    description: "Rackspace Email (secure.emailsrvr.com)"
  },
  { 
    name: "Gmail", 
    host: "smtp.gmail.com",
    ports: { tls: 587, ssl: 465 },
    description: "Gmail (smtp.gmail.com)"
  },
  { 
    name: "Outlook/Office 365", 
    host: "smtp.office365.com",
    ports: { tls: 587, ssl: null },
    description: "Outlook/Office 365 (smtp.office365.com)"
  },
  { 
    name: "Yahoo", 
    host: "smtp.mail.yahoo.com",
    ports: { tls: 587, ssl: 465 },
    description: "Yahoo Mail (smtp.mail.yahoo.com)"
  }
];
