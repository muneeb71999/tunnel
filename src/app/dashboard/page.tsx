"use client";

import { useEffect, useState } from "react";
import { Send, Users, Mail, MousePointerClick, Eye, AlertTriangle, TrendingUp, Flame } from "lucide-react";
import Card, { CardHeader, CardTitle } from "@/components/ui/card";
import pb from "@/lib/pocketbase";
import type { DashboardStats } from "@/types";
import Link from "next/link";
import Button from "@/components/ui/button";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalContacts: 0,
    emailsSent: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0,
    replyRate: 0,
  });
  const [recentCampaigns, setRecentCampaigns] = useState<Array<{
    id: string;
    name: string;
    status: string;
    created: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      // Load campaigns
      const campaigns = await pb.collection("campaigns").getList(1, 50);
      const activeCampaigns = campaigns.items.filter((c) => c.status === "active");

      // Load contacts
      const contacts = await pb.collection("contacts").getList(1, 1);

      // Load email logs
      const emailLogs = await pb.collection("email_logs").getList(1, 1);
      const opened = await pb.collection("email_logs").getList(1, 1, {
        filter: 'status = "opened" || status = "clicked"',
      });
      const clicked = await pb.collection("email_logs").getList(1, 1, {
        filter: 'status = "clicked"',
      });
      const bounced = await pb.collection("email_logs").getList(1, 1, {
        filter: 'status = "bounced"',
      });

      const totalEmails = emailLogs.totalItems || 0;

      setStats({
        totalCampaigns: campaigns.totalItems,
        activeCampaigns: activeCampaigns.length,
        totalContacts: contacts.totalItems,
        emailsSent: totalEmails,
        openRate: totalEmails > 0 ? (opened.totalItems / totalEmails) * 100 : 0,
        clickRate: totalEmails > 0 ? (clicked.totalItems / totalEmails) * 100 : 0,
        bounceRate: totalEmails > 0 ? (bounced.totalItems / totalEmails) * 100 : 0,
        replyRate: 0,
      });

      setRecentCampaigns(
        campaigns.items.slice(0, 5).map((c) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          created: c.created,
        }))
      );
    } catch {
      // PocketBase not connected - show empty state
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    { label: "Total Campaigns", value: stats.totalCampaigns, icon: Send, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active Campaigns", value: stats.activeCampaigns, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "Total Contacts", value: stats.totalContacts, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Emails Sent", value: stats.emailsSent, icon: Mail, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  const rateCards = [
    { label: "Open Rate", value: `${stats.openRate.toFixed(1)}%`, icon: Eye, color: "text-blue-600" },
    { label: "Click Rate", value: `${stats.clickRate.toFixed(1)}%`, icon: MousePointerClick, color: "text-green-600" },
    { label: "Bounce Rate", value: `${stats.bounceRate.toFixed(1)}%`, icon: AlertTriangle, color: "text-red-600" },
    { label: "Reply Rate", value: `${stats.replyRate.toFixed(1)}%`, icon: Flame, color: "text-purple-600" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your outreach performance</p>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Send className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.bg} p-3 rounded-xl`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Rate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {rateCards.map((rate) => {
          const Icon = rate.icon;
          return (
            <Card key={rate.label}>
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${rate.color}`} />
                <div>
                  <p className="text-sm text-gray-500">{rate.label}</p>
                  <p className="text-xl font-bold text-gray-900">{rate.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
          <Link href="/campaigns">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </CardHeader>
        {recentCampaigns.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Send className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No campaigns yet. Create your first campaign to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentCampaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{campaign.name}</p>
                  <p className="text-sm text-gray-500">
                    Created {new Date(campaign.created).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    campaign.status === "active"
                      ? "bg-green-100 text-green-700"
                      : campaign.status === "paused"
                      ? "bg-yellow-100 text-yellow-700"
                      : campaign.status === "completed"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {campaign.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
