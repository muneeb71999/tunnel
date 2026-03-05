"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Play, Pause, Edit, BarChart3, Users, Mail,
  Eye, MousePointerClick, AlertTriangle, FlaskConical,
} from "lucide-react";
import Card, { CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import pb from "@/lib/pocketbase";

interface CampaignDetail {
  id: string;
  name: string;
  status: string;
  daily_limit: number;
  delay_between_emails: number;
  tracking_enabled: boolean;
  ab_testing_enabled: boolean;
  ab_variant_split: number;
  created: string;
}

interface SequenceStep {
  id: string;
  order: number;
  subject: string;
  body: string;
  delay_days: number;
  variant: string;
}

interface CampaignContactItem {
  id: string;
  status: string;
  current_sequence_order: number;
  expand?: { contact_id?: { email: string; first_name: string; last_name: string } };
}

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [sequences, setSequences] = useState<SequenceStep[]>([]);
  const [contacts, setContacts] = useState<CampaignContactItem[]>([]);
  const [stats, setStats] = useState({ sent: 0, opened: 0, clicked: 0, bounced: 0, failed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaign();
  }, [id]);

  async function loadCampaign() {
    try {
      const c = await pb.collection("campaigns").getOne(id);
      setCampaign(c as unknown as CampaignDetail);

      const seqs = await pb.collection("sequences").getList(1, 100, {
        filter: `campaign_id = "${id}"`,
        sort: "variant,order",
      });
      setSequences(seqs.items as unknown as SequenceStep[]);

      const campaignContacts = await pb.collection("campaign_contacts").getList(1, 100, {
        filter: `campaign_id = "${id}"`,
        expand: "contact_id",
      });
      setContacts(campaignContacts.items as unknown as CampaignContactItem[]);

      // Load email log stats
      const logs = await pb.collection("email_logs").getList(1, 1, {
        filter: `campaign_id = "${id}"`,
      });
      const opened = await pb.collection("email_logs").getList(1, 1, {
        filter: `campaign_id = "${id}" && (status = "opened" || status = "clicked")`,
      });
      const clicked = await pb.collection("email_logs").getList(1, 1, {
        filter: `campaign_id = "${id}" && status = "clicked"`,
      });
      const bounced = await pb.collection("email_logs").getList(1, 1, {
        filter: `campaign_id = "${id}" && status = "bounced"`,
      });
      const failed = await pb.collection("email_logs").getList(1, 1, {
        filter: `campaign_id = "${id}" && status = "failed"`,
      });

      setStats({
        sent: logs.totalItems,
        opened: opened.totalItems,
        clicked: clicked.totalItems,
        bounced: bounced.totalItems,
        failed: failed.totalItems,
      });
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus() {
    if (!campaign) return;
    const newStatus = campaign.status === "active" ? "paused" : "active";
    await pb.collection("campaigns").update(id, { status: newStatus });

    // If activating, trigger a send (dedup in the send route prevents double-sends)
    if (newStatus === "active") {
      fetch("/api/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: id }),
      }).catch(() => {
        // The cron job will pick it up on the next cycle
      });
    }

    loadCampaign();
  }

  if (loading || !campaign) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const variantA = sequences.filter((s) => s.variant === "A");
  const variantB = sequences.filter((s) => s.variant === "B");

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/campaigns">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              <Badge
                variant={campaign.status === "active" ? "success" : campaign.status === "paused" ? "warning" : "default"}
              >
                {campaign.status}
              </Badge>
              {campaign.ab_testing_enabled && <Badge variant="info">A/B Test ({campaign.ab_variant_split}%/{100 - campaign.ab_variant_split}%)</Badge>}
            </div>
            <p className="text-gray-500 mt-1">Created {new Date(campaign.created).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={toggleStatus}>
            {campaign.status === "active" ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {campaign.status === "active" ? "Pause" : "Start"}
          </Button>
          <Link href={`/campaigns/${id}/edit`}>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Link href={`/campaigns/${id}/analytics`}>
            <Button>
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {[
          { label: "Sent", value: stats.sent, icon: Mail, color: "text-blue-600" },
          { label: "Opened", value: stats.opened, icon: Eye, color: "text-green-600" },
          { label: "Clicked", value: stats.clicked, icon: MousePointerClick, color: "text-purple-600" },
          { label: "Bounced", value: stats.bounced, icon: AlertTriangle, color: "text-red-600" },
          { label: "Contacts", value: contacts.length, icon: Users, color: "text-orange-600" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${s.color}`} />
                <div>
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Sequences */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>
              <FlaskConical className="w-4 h-4 inline mr-2 text-blue-600" />
              {campaign.ab_testing_enabled ? "Variant A" : "Sequence Steps"}
            </CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {variantA.map((step) => (
              <div key={step.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-blue-600">
                    Step {step.order}
                  </span>
                  <span className="text-xs text-gray-400">
                    {step.delay_days > 0 ? `+${step.delay_days} days` : "Immediate"}
                  </span>
                </div>
                <p className="font-medium text-sm">{step.subject}</p>
              </div>
            ))}
          </div>
        </Card>

        {campaign.ab_testing_enabled && (
          <Card>
            <CardHeader>
              <CardTitle>
                <FlaskConical className="w-4 h-4 inline mr-2 text-orange-600" />
                Variant B
              </CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {variantB.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No variant B steps</p>
              ) : (
                variantB.map((step) => (
                  <div key={step.id} className="border border-orange-200 rounded-lg p-3 bg-orange-50/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-orange-600">Step {step.order}</span>
                      <span className="text-xs text-gray-400">
                        {step.delay_days > 0 ? `+${step.delay_days} days` : "Immediate"}
                      </span>
                    </div>
                    <p className="font-medium text-sm">{step.subject}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Contacts */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Contacts ({contacts.length})</CardTitle>
        </CardHeader>
        {contacts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No contacts assigned to this campaign</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Contact</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Status</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Current Step</th>
                </tr>
              </thead>
              <tbody>
                {contacts.slice(0, 50).map((cc) => (
                  <tr key={cc.id} className="border-b last:border-0">
                    <td className="py-2 px-3">
                      {cc.expand?.contact_id
                        ? `${cc.expand.contact_id.first_name} ${cc.expand.contact_id.last_name} (${cc.expand.contact_id.email})`
                        : "Unknown"}
                    </td>
                    <td className="py-2 px-3">
                      <Badge
                        variant={cc.status === "completed" ? "success" : cc.status === "failed" ? "danger" : "default"}
                      >
                        {cc.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-3">Step {cc.current_sequence_order}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
