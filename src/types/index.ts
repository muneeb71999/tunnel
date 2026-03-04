export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  created: string;
  updated: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: "draft" | "active" | "paused" | "completed";
  email_account_id: string;
  daily_limit: number;
  delay_between_emails: number; // minutes
  tracking_enabled: boolean;
  ab_testing_enabled: boolean;
  ab_variant_split: number; // percentage for variant A
  created: string;
  updated: string;
  user_id: string;
  // expanded
  expand?: {
    email_account_id?: EmailAccount;
    sequences_via_campaign_id?: Sequence[];
  };
}

export interface Sequence {
  id: string;
  campaign_id: string;
  order: number;
  subject: string;
  body: string;
  delay_days: number; // days after previous step
  variant: "A" | "B";
  created: string;
  updated: string;
  // expanded
  expand?: {
    campaign_id?: Campaign;
  };
}

export interface Contact {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company: string;
  title: string;
  phone: string;
  custom_fields: Record<string, string>;
  tags: string[];
  status: "active" | "unsubscribed" | "bounced";
  user_id: string;
  created: string;
  updated: string;
}

export interface ContactList {
  id: string;
  name: string;
  description: string;
  contact_count: number;
  user_id: string;
  created: string;
  updated: string;
}

export interface ContactListMember {
  id: string;
  contact_list_id: string;
  contact_id: string;
  created: string;
}

export interface EmailAccount {
  id: string;
  email: string;
  display_name: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  imap_host: string;
  imap_port: number;
  daily_send_limit: number;
  signature: string;
  is_verified: boolean;
  is_warming: boolean;
  warming_daily_increase: number;
  warming_current_limit: number;
  warming_started_at: string;
  user_id: string;
  created: string;
  updated: string;
}

export interface CustomDomain {
  id: string;
  domain: string;
  tracking_subdomain: string;
  dkim_verified: boolean;
  spf_verified: boolean;
  dmarc_verified: boolean;
  dkim_record: string;
  spf_record: string;
  dmarc_record: string;
  user_id: string;
  created: string;
  updated: string;
}

export interface CampaignContact {
  id: string;
  campaign_id: string;
  contact_id: string;
  contact_list_id: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "unsubscribed";
  current_sequence_order: number;
  last_sent_at: string;
  created: string;
  updated: string;
  // expanded
  expand?: {
    contact_id?: Contact;
    campaign_id?: Campaign;
  };
}

export interface EmailLog {
  id: string;
  campaign_id: string;
  sequence_id: string;
  contact_id: string;
  email_account_id: string;
  status: "sent" | "delivered" | "opened" | "clicked" | "bounced" | "failed";
  variant: "A" | "B";
  subject: string;
  body: string;
  sent_at: string;
  opened_at: string;
  clicked_at: string;
  created: string;
  updated: string;
}

export interface WarmingLog {
  id: string;
  email_account_id: string;
  emails_sent: number;
  emails_received: number;
  date: string;
  created: string;
}

export interface DashboardStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalContacts: number;
  emailsSent: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  replyRate: number;
}
