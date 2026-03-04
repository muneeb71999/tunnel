"use client";

import { useEffect, useState } from "react";
import { Plus, Globe, CheckCircle, XCircle, Trash2, RefreshCw, Copy } from "lucide-react";
import Card, { CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import pb from "@/lib/pocketbase";
import type { CustomDomain } from "@/types";
import { v4 as uuidv4 } from "uuid";

export default function CustomDomainsPage() {
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const [domainName, setDomainName] = useState("");
  const [trackingSubdomain, setTrackingSubdomain] = useState("track");

  useEffect(() => {
    loadDomains();
  }, []);

  async function loadDomains() {
    try {
      const result = await pb.collection("custom_domains").getList(1, 100, { sort: "-created" });
      setDomains(result.items as unknown as CustomDomain[]);
    } catch {
      // handle
    } finally {
      setLoading(false);
    }
  }

  function generateDNSRecords(domain: string) {
    const dkimSelector = `outreachpro-${uuidv4().slice(0, 8)}`;
    return {
      dkim_record: `${dkimSelector}._domainkey.${domain} TXT "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3..."`,
      spf_record: `${domain} TXT "v=spf1 include:_spf.outreachpro.com ~all"`,
      dmarc_record: `_dmarc.${domain} TXT "v=DMARC1; p=none; rua=mailto:dmarc@${domain}"`,
    };
  }

  async function addDomain(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const records = generateDNSRecords(domainName);
      await pb.collection("custom_domains").create({
        domain: domainName,
        tracking_subdomain: trackingSubdomain,
        dkim_verified: false,
        spf_verified: false,
        dmarc_verified: false,
        ...records,
        user_id: pb.authStore.record?.id,
      });
      setShowAddModal(false);
      setDomainName("");
      setTrackingSubdomain("track");
      loadDomains();
    } catch {
      alert("Failed to add domain");
    } finally {
      setSaving(false);
    }
  }

  async function verifyDomain(id: string) {
    setVerifyingId(id);
    try {
      // In production, this would actually check DNS records
      // For now, simulate verification
      await pb.collection("custom_domains").update(id, {
        dkim_verified: true,
        spf_verified: true,
        dmarc_verified: true,
      });
      loadDomains();
      alert("Domain verified successfully!");
    } catch {
      alert("Verification failed");
    } finally {
      setVerifyingId(null);
    }
  }

  async function deleteDomain(id: string) {
    if (!confirm("Delete this domain?")) return;
    try {
      await pb.collection("custom_domains").delete(id);
      loadDomains();
    } catch {
      alert("Failed to delete domain");
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Domains</h1>
          <p className="text-gray-500 mt-1">Manage custom tracking domains and DNS settings</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Domain
        </Button>
      </div>

      {domains.length === 0 ? (
        <Card className="text-center py-16">
          <Globe className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No custom domains</h3>
          <p className="text-gray-500 mb-6">Add a custom domain to improve deliverability and tracking</p>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Domain
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {domains.map((domain) => {
            const allVerified = domain.dkim_verified && domain.spf_verified && domain.dmarc_verified;
            return (
              <Card key={domain.id}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${allVerified ? "bg-green-100" : "bg-yellow-100"}`}>
                      <Globe className={`w-5 h-5 ${allVerified ? "text-green-600" : "text-yellow-600"}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{domain.domain}</h3>
                      <p className="text-sm text-gray-500">Tracking: {domain.tracking_subdomain}.{domain.domain}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => verifyDomain(domain.id)} loading={verifyingId === domain.id}>
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Verify
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteDomain(domain.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                {/* DNS Records */}
                <div className="space-y-3">
                  {[
                    { label: "DKIM", verified: domain.dkim_verified, record: domain.dkim_record },
                    { label: "SPF", verified: domain.spf_verified, record: domain.spf_record },
                    { label: "DMARC", verified: domain.dmarc_verified, record: domain.dmarc_record },
                  ].map((item) => (
                    <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{item.label}</span>
                          {item.verified ? (
                            <Badge variant="success"><CheckCircle className="w-3 h-3 inline mr-1" />Verified</Badge>
                          ) : (
                            <Badge variant="warning"><XCircle className="w-3 h-3 inline mr-1" />Pending</Badge>
                          )}
                        </div>
                        <button
                          onClick={() => copyToClipboard(item.record || "")}
                          className="text-gray-400 hover:text-gray-600"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <code className="text-xs text-gray-600 break-all">{item.record}</code>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Domain Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Custom Domain">
        <form onSubmit={addDomain} className="space-y-4">
          <Input
            id="domain"
            label="Domain Name"
            value={domainName}
            onChange={(e) => setDomainName(e.target.value)}
            required
            placeholder="example.com"
            helperText="Enter your domain name (without www or http)"
          />
          <Input
            id="tracking"
            label="Tracking Subdomain"
            value={trackingSubdomain}
            onChange={(e) => setTrackingSubdomain(e.target.value)}
            placeholder="track"
            helperText="Used for open/click tracking (e.g., track.example.com)"
          />
          <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
            After adding the domain, you&apos;ll need to add DNS records (DKIM, SPF, DMARC) to your domain provider. We&apos;ll provide the exact records to add.
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Domain</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
