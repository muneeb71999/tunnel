"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Card, { CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import pb from "@/lib/pocketbase";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EditCampaignPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailAccounts, setEmailAccounts] = useState<{ value: string; label: string }[]>([]);

  const [name, setName] = useState("");
  const [emailAccountId, setEmailAccountId] = useState("");
  const [dailyLimit, setDailyLimit] = useState("50");
  const [delayBetweenEmails, setDelayBetweenEmails] = useState("5");
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [abVariantSplit, setAbVariantSplit] = useState("50");

  useEffect(() => {
    loadCampaign();
  }, [id]);

  async function loadCampaign() {
    try {
      const campaign = await pb.collection("campaigns").getOne(id);
      setName(campaign.name);
      setEmailAccountId(campaign.email_account_id);
      setDailyLimit(String(campaign.daily_limit));
      setDelayBetweenEmails(String(campaign.delay_between_emails));
      setTrackingEnabled(campaign.tracking_enabled);
      setAbVariantSplit(String(campaign.ab_variant_split));

      const accounts = await pb.collection("email_accounts").getList(1, 100);
      setEmailAccounts(accounts.items.map((a) => ({ value: a.id, label: `${a.display_name} <${a.email}>` })));
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await pb.collection("campaigns").update(id, {
        name,
        email_account_id: emailAccountId,
        daily_limit: parseInt(dailyLimit),
        delay_between_emails: parseInt(delayBetweenEmails),
        tracking_enabled: trackingEnabled,
        ab_variant_split: parseInt(abVariantSplit),
      });
      router.push(`/campaigns/${id}`);
    } catch {
      alert("Failed to update campaign");
    } finally {
      setSaving(false);
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
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/campaigns/${id}`}>
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Campaign</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle>Campaign Settings</CardTitle></CardHeader>
          <div className="space-y-4">
            <Input id="name" label="Campaign Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Select
              id="emailAccount"
              label="Email Account"
              options={[{ value: "", label: "Select..." }, ...emailAccounts]}
              value={emailAccountId}
              onChange={(e) => setEmailAccountId(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input id="dailyLimit" label="Daily Limit" type="number" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} />
              <Input id="delay" label="Delay (minutes)" type="number" value={delayBetweenEmails} onChange={(e) => setDelayBetweenEmails(e.target.value)} />
            </div>
            <Input id="abSplit" label="A/B Split (% for A)" type="number" value={abVariantSplit} onChange={(e) => setAbVariantSplit(e.target.value)} />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={trackingEnabled} onChange={(e) => setTrackingEnabled(e.target.checked)} className="rounded border-gray-300" />
              <span className="text-sm text-gray-700">Enable tracking</span>
            </label>
          </div>
        </Card>
        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/campaigns/${id}`}><Button variant="secondary">Cancel</Button></Link>
          <Button type="submit" loading={saving}>Save Changes</Button>
        </div>
      </form>
    </div>
  );
}
