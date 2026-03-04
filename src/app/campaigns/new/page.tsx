"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Card, { CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Textarea from "@/components/ui/textarea";
import pb from "@/lib/pocketbase";
import { ArrowLeft, Plus, Trash2, FlaskConical } from "lucide-react";
import Link from "next/link";

interface SequenceStep {
  order: number;
  subject: string;
  body: string;
  delay_days: number;
  variant: "A" | "B";
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [emailAccounts, setEmailAccounts] = useState<{ value: string; label: string }[]>([]);
  const [contactLists, setContactLists] = useState<{ value: string; label: string }[]>([]);

  const [name, setName] = useState("");
  const [emailAccountId, setEmailAccountId] = useState("");
  const [contactListId, setContactListId] = useState("");
  const [dailyLimit, setDailyLimit] = useState("50");
  const [delayBetweenEmails, setDelayBetweenEmails] = useState("5");
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [abTestingEnabled, setAbTestingEnabled] = useState(false);
  const [abVariantSplit, setAbVariantSplit] = useState("50");

  const [sequences, setSequences] = useState<SequenceStep[]>([
    { order: 1, subject: "", body: "", delay_days: 0, variant: "A" },
  ]);

  useEffect(() => {
    loadOptions();
  }, []);

  async function loadOptions() {
    try {
      const accounts = await pb.collection("email_accounts").getList(1, 100);
      setEmailAccounts(
        accounts.items.map((a) => ({ value: a.id, label: `${a.display_name} <${a.email}>` }))
      );

      const lists = await pb.collection("contact_lists").getList(1, 100);
      setContactLists(lists.items.map((l) => ({ value: l.id, label: l.name })));

      if (accounts.items.length > 0) setEmailAccountId(accounts.items[0].id);
      if (lists.items.length > 0) setContactListId(lists.items[0].id);
    } catch {
      // PocketBase not available
    }
  }

  function addSequenceStep(variant: "A" | "B" = "A") {
    const maxOrder = Math.max(...sequences.filter((s) => s.variant === variant).map((s) => s.order), 0);
    setSequences([
      ...sequences,
      { order: maxOrder + 1, subject: "", body: "", delay_days: maxOrder === 0 ? 0 : 3, variant },
    ]);
  }

  function removeSequenceStep(index: number) {
    setSequences(sequences.filter((_, i) => i !== index));
  }

  function updateSequence(index: number, field: keyof SequenceStep, value: string | number) {
    const updated = [...sequences];
    updated[index] = { ...updated[index], [field]: value };
    setSequences(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return alert("Please enter a campaign name");
    if (sequences.filter((s) => s.variant === "A").length === 0) {
      return alert("Please add at least one sequence step");
    }

    setLoading(true);
    try {
      // Create campaign
      const campaign = await pb.collection("campaigns").create({
        name,
        status: "draft",
        email_account_id: emailAccountId,
        daily_limit: parseInt(dailyLimit),
        delay_between_emails: parseInt(delayBetweenEmails),
        tracking_enabled: trackingEnabled,
        ab_testing_enabled: abTestingEnabled,
        ab_variant_split: parseInt(abVariantSplit),
        user_id: pb.authStore.record?.id,
      });

      // Create sequence steps
      for (const seq of sequences) {
        await pb.collection("sequences").create({
          campaign_id: campaign.id,
          order: seq.order,
          subject: seq.subject,
          body: seq.body,
          delay_days: seq.delay_days,
          variant: seq.variant,
        });
      }

      // Assign contacts from list
      if (contactListId) {
        const members = await pb.collection("contact_list_members").getList(1, 500, {
          filter: `contact_list_id = "${contactListId}"`,
        });
        for (const member of members.items) {
          await pb.collection("campaign_contacts").create({
            campaign_id: campaign.id,
            contact_id: member.contact_id,
            contact_list_id: contactListId,
            status: "pending",
            current_sequence_order: 0,
          });
        }
      }

      router.push(`/campaigns/${campaign.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create campaign. Make sure PocketBase is running.");
    } finally {
      setLoading(false);
    }
  }

  const variantASteps = sequences.filter((s) => s.variant === "A");
  const variantBSteps = sequences.filter((s) => s.variant === "B");

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/campaigns">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Campaign</h1>
          <p className="text-gray-500 mt-1">Set up a new email outreach campaign</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <Input
              id="name"
              label="Campaign Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Q1 Outreach - SaaS Founders"
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                id="emailAccount"
                label="Email Account"
                options={[{ value: "", label: "Select email account..." }, ...emailAccounts]}
                value={emailAccountId}
                onChange={(e) => setEmailAccountId(e.target.value)}
              />
              <Select
                id="contactList"
                label="Contact List"
                options={[{ value: "", label: "Select contact list..." }, ...contactLists]}
                value={contactListId}
                onChange={(e) => setContactListId(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="dailyLimit"
                label="Daily Send Limit"
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                min="1"
                max="500"
              />
              <Input
                id="delay"
                label="Delay Between Emails (minutes)"
                type="number"
                value={delayBetweenEmails}
                onChange={(e) => setDelayBetweenEmails(e.target.value)}
                min="1"
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={trackingEnabled}
                  onChange={(e) => setTrackingEnabled(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Enable open/click tracking</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={abTestingEnabled}
                  onChange={(e) => setAbTestingEnabled(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  <FlaskConical className="w-4 h-4 inline mr-1" />
                  Enable A/B Testing
                </span>
              </label>
            </div>
            {abTestingEnabled && (
              <Input
                id="abSplit"
                label="A/B Split (% for Variant A)"
                type="number"
                value={abVariantSplit}
                onChange={(e) => setAbVariantSplit(e.target.value)}
                min="10"
                max="90"
                helperText="The remaining percentage goes to Variant B"
              />
            )}
          </div>
        </Card>

        {/* Sequence Steps - Variant A */}
        <Card>
          <CardHeader>
            <CardTitle>
              Sequence Steps {abTestingEnabled && "- Variant A"}
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => addSequenceStep("A")}>
              <Plus className="w-4 h-4 mr-1" />
              Add Step
            </Button>
          </CardHeader>
          <div className="space-y-6">
            {variantASteps.map((step, idx) => {
              const seqIdx = sequences.indexOf(step);
              return (
                <div key={seqIdx} className="border rounded-lg p-4 relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-blue-600">
                      Step {step.order} {step.delay_days > 0 ? `(+${step.delay_days} days)` : "(Immediate)"}
                    </span>
                    {variantASteps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSequenceStep(seqIdx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {step.order > 1 && (
                      <Input
                        label="Wait (days after previous step)"
                        type="number"
                        value={step.delay_days.toString()}
                        onChange={(e) => updateSequence(seqIdx, "delay_days", parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    )}
                    <Input
                      label="Subject Line"
                      value={step.subject}
                      onChange={(e) => updateSequence(seqIdx, "subject", e.target.value)}
                      placeholder="Hi {{first_name}}, quick question about {{company}}"
                    />
                    <Textarea
                      label="Email Body (HTML supported)"
                      value={step.body}
                      onChange={(e) => updateSequence(seqIdx, "body", e.target.value)}
                      placeholder="Use {{first_name}}, {{last_name}}, {{company}}, {{title}} for personalization"
                      rows={6}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Sequence Steps - Variant B (if A/B testing) */}
        {abTestingEnabled && (
          <Card>
            <CardHeader>
              <CardTitle>Sequence Steps - Variant B</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => addSequenceStep("B")}>
                <Plus className="w-4 h-4 mr-1" />
                Add Step
              </Button>
            </CardHeader>
            <div className="space-y-6">
              {variantBSteps.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FlaskConical className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p>Add steps for Variant B to test different messaging</p>
                </div>
              ) : (
                variantBSteps.map((step, idx) => {
                  const seqIdx = sequences.indexOf(step);
                  return (
                    <div key={seqIdx} className="border rounded-lg p-4 border-orange-200 bg-orange-50/30">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-orange-600">
                          Step {idx + 1} {step.delay_days > 0 ? `(+${step.delay_days} days)` : "(Immediate)"}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSequenceStep(seqIdx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        {idx > 0 && (
                          <Input
                            label="Wait (days)"
                            type="number"
                            value={step.delay_days.toString()}
                            onChange={(e) => updateSequence(seqIdx, "delay_days", parseInt(e.target.value) || 0)}
                            min="0"
                          />
                        )}
                        <Input
                          label="Subject Line"
                          value={step.subject}
                          onChange={(e) => updateSequence(seqIdx, "subject", e.target.value)}
                          placeholder="Different subject for B variant"
                        />
                        <Textarea
                          label="Email Body"
                          value={step.body}
                          onChange={(e) => updateSequence(seqIdx, "body", e.target.value)}
                          placeholder="Different copy for B variant"
                          rows={6}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        )}

        <div className="flex items-center justify-end gap-4">
          <Link href="/campaigns">
            <Button variant="secondary">Cancel</Button>
          </Link>
          <Button type="submit" loading={loading}>
            Create Campaign
          </Button>
        </div>
      </form>
    </div>
  );
}
