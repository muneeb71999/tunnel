"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Send, Play, Pause, MoreVertical, Trash2, BarChart3 } from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import pb from "@/lib/pocketbase";
import type { Campaign } from "@/types";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    try {
      const result = await pb.collection("campaigns").getList(1, 50, {
        sort: "-created",
        expand: "email_account_id",
      });
      setCampaigns(result.items as unknown as Campaign[]);
    } catch {
      // PocketBase not available
    } finally {
      setLoading(false);
    }
  }

  async function toggleCampaignStatus(campaign: Campaign) {
    const newStatus = campaign.status === "active" ? "paused" : "active";
    try {
      await pb.collection("campaigns").update(campaign.id, { status: newStatus });
      loadCampaigns();
    } catch {
      alert("Failed to update campaign status");
    }
  }

  async function deleteCampaign(id: string) {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    try {
      await pb.collection("campaigns").delete(id);
      loadCampaigns();
    } catch {
      alert("Failed to delete campaign");
    }
  }

  const statusVariant = (status: string) => {
    switch (status) {
      case "active": return "success" as const;
      case "paused": return "warning" as const;
      case "completed": return "info" as const;
      default: return "default" as const;
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-500 mt-1">Manage your email outreach campaigns</p>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <Card className="text-center py-16">
          <Send className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
          <p className="text-gray-500 mb-6">Create your first campaign to start reaching out</p>
          <Link href="/campaigns/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                    >
                      {campaign.name}
                    </Link>
                    <Badge variant={statusVariant(campaign.status)}>{campaign.status}</Badge>
                    {campaign.ab_testing_enabled && (
                      <Badge variant="info">A/B Test</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <span>Daily limit: {campaign.daily_limit}</span>
                    <span>Delay: {campaign.delay_between_emails} min</span>
                    <span>Created: {new Date(campaign.created).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCampaignStatus(campaign)}
                    title={campaign.status === "active" ? "Pause" : "Start"}
                  >
                    {campaign.status === "active" ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>

                  <Link href={`/campaigns/${campaign.id}/analytics`}>
                    <Button variant="ghost" size="sm" title="Analytics">
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                  </Link>

                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMenuOpen(menuOpen === campaign.id ? null : campaign.id)}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                    {menuOpen === campaign.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 z-10 w-48">
                        <Link
                          href={`/campaigns/${campaign.id}/edit`}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Edit Campaign
                        </Link>
                        <button
                          onClick={() => {
                            deleteCampaign(campaign.id);
                            setMenuOpen(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 inline mr-2" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
