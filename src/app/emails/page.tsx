"use client";

import { useEffect, useState } from "react";
import { Plus, Mail, CheckCircle, XCircle, Trash2, TestTube } from "lucide-react";
import Card, { CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Modal from "@/components/ui/modal";
import pb from "@/lib/pocketbase";
import type { EmailAccount } from "@/types";

export default function EmailAccountsPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("993");
  const [dailySendLimit, setDailySendLimit] = useState("100");
  const [signature, setSignature] = useState("");

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    try {
      const result = await pb.collection("email_accounts").getList(1, 100, { sort: "-created" });
      setAccounts(result.items as unknown as EmailAccount[]);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEmail("");
    setDisplayName("");
    setSmtpHost("");
    setSmtpPort("587");
    setSmtpUsername("");
    setSmtpPassword("");
    setImapHost("");
    setImapPort("993");
    setDailySendLimit("100");
    setSignature("");
  }

  async function addAccount(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await pb.collection("email_accounts").create({
        email,
        display_name: displayName,
        smtp_host: smtpHost,
        smtp_port: parseInt(smtpPort),
        smtp_username: smtpUsername,
        smtp_password: smtpPassword,
        imap_host: imapHost,
        imap_port: parseInt(imapPort),
        daily_send_limit: parseInt(dailySendLimit),
        signature,
        is_verified: false,
        is_warming: false,
        warming_daily_increase: 2,
        warming_current_limit: 0,
        user_id: pb.authStore.record?.id,
      });
      setShowAddModal(false);
      resetForm();
      loadAccounts();
    } catch {
      alert("Failed to add email account");
    } finally {
      setSaving(false);
    }
  }

  async function testConnection(accountId: string) {
    setTestingId(accountId);
    try {
      const res = await fetch("/api/emails/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: accountId }),
      });
      const data = await res.json();
      if (data.success) {
        await pb.collection("email_accounts").update(accountId, { is_verified: true });
        alert("Connection successful! Email account verified.");
      } else {
        alert(`Connection failed: ${data.error}`);
      }
      loadAccounts();
    } catch {
      alert("Failed to test connection");
    } finally {
      setTestingId(null);
    }
  }

  async function deleteAccount(id: string) {
    if (!confirm("Delete this email account?")) return;
    try {
      await pb.collection("email_accounts").delete(id);
      loadAccounts();
    } catch {
      alert("Failed to delete account");
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Accounts</h1>
          <p className="text-gray-500 mt-1">Connect your email accounts for sending campaigns</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card className="text-center py-16">
          <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No email accounts</h3>
          <p className="text-gray-500 mb-6">Add an email account to start sending campaigns</p>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Email Account
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => (
            <Card key={account.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    account.is_verified ? "bg-green-100" : "bg-gray-100"
                  }`}>
                    <Mail className={`w-5 h-5 ${account.is_verified ? "text-green-600" : "text-gray-400"}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{account.display_name}</h3>
                      {account.is_verified ? (
                        <Badge variant="success"><CheckCircle className="w-3 h-3 inline mr-1" />Verified</Badge>
                      ) : (
                        <Badge variant="warning"><XCircle className="w-3 h-3 inline mr-1" />Unverified</Badge>
                      )}
                      {account.is_warming && <Badge variant="info">Warming</Badge>}
                    </div>
                    <p className="text-sm text-gray-500">{account.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      SMTP: {account.smtp_host}:{account.smtp_port} | Daily limit: {account.daily_send_limit}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testConnection(account.id)}
                    loading={testingId === account.id}
                  >
                    <TestTube className="w-4 h-4 mr-1" />
                    Test
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteAccount(account.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Account Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Email Account" size="lg">
        <form onSubmit={addAccount} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input id="email" label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            <Input id="displayName" label="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required placeholder="John Doe" />
          </div>

          <h4 className="font-medium text-gray-900 pt-2">SMTP Settings (Outgoing)</h4>
          <div className="grid grid-cols-2 gap-4">
            <Input id="smtpHost" label="SMTP Host" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} required placeholder="smtp.gmail.com" />
            <Input id="smtpPort" label="SMTP Port" type="number" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input id="smtpUser" label="SMTP Username" value={smtpUsername} onChange={(e) => setSmtpUsername(e.target.value)} required placeholder="you@example.com" />
            <Input id="smtpPass" label="SMTP Password" type="password" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} required placeholder="App password" />
          </div>

          <h4 className="font-medium text-gray-900 pt-2">IMAP Settings (Incoming)</h4>
          <div className="grid grid-cols-2 gap-4">
            <Input id="imapHost" label="IMAP Host" value={imapHost} onChange={(e) => setImapHost(e.target.value)} placeholder="imap.gmail.com" />
            <Input id="imapPort" label="IMAP Port" type="number" value={imapPort} onChange={(e) => setImapPort(e.target.value)} />
          </div>

          <Input id="dailyLimit" label="Daily Send Limit" type="number" value={dailySendLimit} onChange={(e) => setDailySendLimit(e.target.value)} />
          <Textarea id="signature" label="Email Signature (HTML)" value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="<p>Best regards,<br>John Doe</p>" />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Account</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
