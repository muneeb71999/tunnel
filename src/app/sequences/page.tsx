"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GitBranch, ArrowRight } from "lucide-react";
import Card from "@/components/ui/card";
import Badge from "@/components/ui/badge";
import pb from "@/lib/pocketbase";

interface CampaignWithSequences {
  id: string;
  name: string;
  status: string;
  ab_testing_enabled: boolean;
  sequences: { id: string; order: number; subject: string; variant: string; delay_days: number }[];
}

export default function SequencesPage() {
  const [campaigns, setCampaigns] = useState<CampaignWithSequences[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSequences();
  }, []);

  async function loadSequences() {
    try {
      const campaignResult = await pb.collection("campaigns").getList(1, 100, { sort: "-created" });
      const items: CampaignWithSequences[] = [];

      for (const campaign of campaignResult.items) {
        const seqs = await pb.collection("sequences").getList(1, 100, {
          filter: `campaign_id = "${campaign.id}"`,
          sort: "variant,order",
        });
        items.push({
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          ab_testing_enabled: campaign.ab_testing_enabled,
          sequences: seqs.items.map((s) => ({
            id: s.id,
            order: s.order,
            subject: s.subject,
            variant: s.variant,
            delay_days: s.delay_days,
          })),
        });
      }
      setCampaigns(items);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Sequences</h1>
        <p className="text-gray-500 mt-1">View and manage email sequences across campaigns</p>
      </div>

      {campaigns.length === 0 ? (
        <Card className="text-center py-16">
          <GitBranch className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sequences yet</h3>
          <p className="text-gray-500">Create a campaign to add email sequences</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {campaigns.map((campaign) => {
            const variantA = campaign.sequences.filter((s) => s.variant === "A");
            const variantB = campaign.sequences.filter((s) => s.variant === "B");

            return (
              <Card key={campaign.id}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Link href={`/campaigns/${campaign.id}`} className="font-semibold text-gray-900 hover:text-blue-600">
                      {campaign.name}
                    </Link>
                    <Badge variant={campaign.status === "active" ? "success" : "default"}>
                      {campaign.status}
                    </Badge>
                    {campaign.ab_testing_enabled && <Badge variant="info">A/B</Badge>}
                  </div>
                  <span className="text-sm text-gray-500">{campaign.sequences.length} steps</span>
                </div>

                {/* Visual sequence flow */}
                <div className="space-y-3">
                  {/* Variant A */}
                  <div>
                    {campaign.ab_testing_enabled && (
                      <span className="text-xs font-medium text-blue-600 mb-1 block">Variant A</span>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {variantA.map((step, idx) => (
                        <div key={step.id} className="flex items-center gap-2">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm">
                            <span className="text-blue-600 font-medium">Step {step.order}</span>
                            <p className="text-gray-700 text-xs mt-0.5 truncate max-w-[200px]">{step.subject || "No subject"}</p>
                            {step.delay_days > 0 && (
                              <span className="text-xs text-gray-400">+{step.delay_days}d</span>
                            )}
                          </div>
                          {idx < variantA.length - 1 && (
                            <ArrowRight className="w-4 h-4 text-gray-300" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Variant B */}
                  {campaign.ab_testing_enabled && variantB.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-orange-600 mb-1 block">Variant B</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {variantB.map((step, idx) => (
                          <div key={step.id} className="flex items-center gap-2">
                            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm">
                              <span className="text-orange-600 font-medium">Step {step.order}</span>
                              <p className="text-gray-700 text-xs mt-0.5 truncate max-w-[200px]">{step.subject || "No subject"}</p>
                              {step.delay_days > 0 && (
                                <span className="text-xs text-gray-400">+{step.delay_days}d</span>
                              )}
                            </div>
                            {idx < variantB.length - 1 && (
                              <ArrowRight className="w-4 h-4 text-gray-300" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
