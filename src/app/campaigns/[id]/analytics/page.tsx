"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FlaskConical } from "lucide-react";
import Card, { CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import pb from "@/lib/pocketbase";

interface VariantStats {
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  openRate: number;
  clickRate: number;
}

export default function CampaignAnalyticsPage() {
  const params = useParams();
  const id = params.id as string;
  const [campaign, setCampaign] = useState<{ name: string; ab_testing_enabled: boolean; ab_variant_split: number } | null>(null);
  const [variantA, setVariantA] = useState<VariantStats>({ sent: 0, opened: 0, clicked: 0, bounced: 0, openRate: 0, clickRate: 0 });
  const [variantB, setVariantB] = useState<VariantStats>({ sent: 0, opened: 0, clicked: 0, bounced: 0, openRate: 0, clickRate: 0 });
  const [dailyStats, setDailyStats] = useState<{ date: string; sent: number; opened: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [id]);

  async function loadAnalytics() {
    try {
      const c = await pb.collection("campaigns").getOne(id);
      setCampaign({ name: c.name, ab_testing_enabled: c.ab_testing_enabled, ab_variant_split: c.ab_variant_split });

      // Variant A stats
      const aStats = await loadVariantStats("A");
      setVariantA(aStats);

      // Variant B stats
      if (c.ab_testing_enabled) {
        const bStats = await loadVariantStats("B");
        setVariantB(bStats);
      }

      // Daily send stats (last 30 days)
      const logs = await pb.collection("email_logs").getList(1, 500, {
        filter: `campaign_id = "${id}"`,
        sort: "-sent_at",
      });

      const daily: Record<string, { sent: number; opened: number }> = {};
      for (const log of logs.items) {
        const date = log.sent_at ? new Date(log.sent_at).toLocaleDateString() : "Unknown";
        if (!daily[date]) daily[date] = { sent: 0, opened: 0 };
        daily[date].sent++;
        if (log.status === "opened" || log.status === "clicked") daily[date].opened++;
      }
      setDailyStats(Object.entries(daily).map(([date, s]) => ({ date, ...s })).slice(0, 14));
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  async function loadVariantStats(variant: string): Promise<VariantStats> {
    const sent = await pb.collection("email_logs").getList(1, 1, {
      filter: `campaign_id = "${id}" && variant = "${variant}"`,
    });
    const opened = await pb.collection("email_logs").getList(1, 1, {
      filter: `campaign_id = "${id}" && variant = "${variant}" && (status = "opened" || status = "clicked")`,
    });
    const clicked = await pb.collection("email_logs").getList(1, 1, {
      filter: `campaign_id = "${id}" && variant = "${variant}" && status = "clicked"`,
    });
    const bounced = await pb.collection("email_logs").getList(1, 1, {
      filter: `campaign_id = "${id}" && variant = "${variant}" && status = "bounced"`,
    });

    const total = sent.totalItems || 0;
    return {
      sent: total,
      opened: opened.totalItems,
      clicked: clicked.totalItems,
      bounced: bounced.totalItems,
      openRate: total > 0 ? (opened.totalItems / total) * 100 : 0,
      clickRate: total > 0 ? (clicked.totalItems / total) * 100 : 0,
    };
  }

  if (loading || !campaign) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/campaigns/${id}`}>
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{campaign.name} - Analytics</h1>
          <p className="text-gray-500 mt-1">Performance metrics and A/B test results</p>
        </div>
      </div>

      {/* A/B Test Comparison */}
      <div className={`grid ${campaign.ab_testing_enabled ? "grid-cols-2" : "grid-cols-1"} gap-6 mb-8`}>
        <Card>
          <CardHeader>
            <CardTitle>
              <FlaskConical className="w-4 h-4 inline mr-2 text-blue-600" />
              {campaign.ab_testing_enabled ? `Variant A (${campaign.ab_variant_split}%)` : "Campaign Performance"}
            </CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{variantA.sent}</p>
                <p className="text-sm text-gray-500">Emails Sent</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{variantA.openRate.toFixed(1)}%</p>
                <p className="text-sm text-gray-500">Open Rate</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">{variantA.clickRate.toFixed(1)}%</p>
                <p className="text-sm text-gray-500">Click Rate</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{variantA.bounced}</p>
                <p className="text-sm text-gray-500">Bounced</p>
              </div>
            </div>
          </div>
        </Card>

        {campaign.ab_testing_enabled && (
          <Card>
            <CardHeader>
              <CardTitle>
                <FlaskConical className="w-4 h-4 inline mr-2 text-orange-600" />
                Variant B ({100 - campaign.ab_variant_split}%)
              </CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{variantB.sent}</p>
                  <p className="text-sm text-gray-500">Emails Sent</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{variantB.openRate.toFixed(1)}%</p>
                  <p className="text-sm text-gray-500">Open Rate</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">{variantB.clickRate.toFixed(1)}%</p>
                  <p className="text-sm text-gray-500">Click Rate</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{variantB.bounced}</p>
                  <p className="text-sm text-gray-500">Bounced</p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* A/B Winner */}
      {campaign.ab_testing_enabled && (variantA.sent > 0 || variantB.sent > 0) && (
        <Card className="mb-8 border-green-200 bg-green-50/30">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">A/B Test Winner</h3>
            {variantA.openRate > variantB.openRate ? (
              <p className="text-green-700">
                Variant A is winning with {variantA.openRate.toFixed(1)}% open rate vs {variantB.openRate.toFixed(1)}%
              </p>
            ) : variantB.openRate > variantA.openRate ? (
              <p className="text-orange-700">
                Variant B is winning with {variantB.openRate.toFixed(1)}% open rate vs {variantA.openRate.toFixed(1)}%
              </p>
            ) : (
              <p className="text-gray-600">Both variants are performing equally</p>
            )}
          </div>
        </Card>
      )}

      {/* Daily Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Sending Activity</CardTitle>
        </CardHeader>
        {dailyStats.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No sending data yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Date</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Sent</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Opened</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Open Rate</th>
                </tr>
              </thead>
              <tbody>
                {dailyStats.map((d) => (
                  <tr key={d.date} className="border-b last:border-0">
                    <td className="py-2 px-3">{d.date}</td>
                    <td className="py-2 px-3">{d.sent}</td>
                    <td className="py-2 px-3">{d.opened}</td>
                    <td className="py-2 px-3">
                      {d.sent > 0 ? ((d.opened / d.sent) * 100).toFixed(1) : 0}%
                    </td>
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
