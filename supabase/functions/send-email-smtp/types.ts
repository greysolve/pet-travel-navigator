
export interface EmailRequest {
  to?: string;
  subject?: string;
  html?: string;
  name?: string;
  email?: string;
  message?: string;
}

export interface SMTPSettings {
  use_smtp: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_security?: string;
  smtp_secure?: boolean;
  smtp_from_name?: string;
  smtp_from_email?: string;
  support_email: string;
  auto_reply_subject?: string;
  auto_reply_template?: string;
}

export interface SMTPConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  timeout: number;
  ssl?: boolean;
  tls?: boolean;
}
