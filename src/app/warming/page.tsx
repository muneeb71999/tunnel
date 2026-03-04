"use client";

import { useEffect, useState } from "react";
import { Flame, Play, Square, TrendingUp, Mail, Calendar } from "lucide-react";
import Card, { CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import pb from "@/lib/pocketbase";
import type { EmailAccount, WarmingLog } from "@/types";

export default function WarmingPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [warmingLogs, setWarmingLogs] = useState<Record<string, WarmingLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const result = await pb.collection("email_accounts").getList(1, 100, { sort: "-created" });
      setAccounts(result.items as unknown as EmailAccount[]);

      // Load warming logs for each account
      const logs: Record<string, WarmingLog[]> = {};
      for (const account of result.items) {
        const accountLogs = await pb.collection("warming_logs").getList(1, 14, {
          filter: `email_account_id = "${account.id}"`,
          sort: "-date",
        });
        logs[account.id] = accountLogs.items as unknown as WarmingLog[];
      }
      setWarmingLogs(logs);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  async function toggleWarming(account: EmailAccount) {
    setTogglingId(account.id);
    try {
      if (account.is_warming) {
        // Stop warming
        await pb.collection("email_accounts").update(account.id, {
          is_warming: false,
        });

        // Call stop API
        await fetch("/api/warming/stop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ account_id: account.id }),
        });
      } else {
        // Start warming
        await pb.collection("email_accounts").update(account.id, {
          is_warming: true,
          warming_started_at: new Date().toISOString(),
          warming_current_limit: 2,
        });

        // Call start API
        await fetch("/api/warming/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ account_id: account.id }),
        });
      }
      loadData();
    } catch {
      alert("Failed to toggle warming");
    } finally {
      setTogglingId(null);
    }
  }

  function calculateWarmingProgress(account: EmailAccount): number {
    if (!account.warming_started_at) return 0;
    const startDate = new Date(account.warming_started_at);
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    // Warming typically takes ~30 days
    return Math.min(Math.round((daysSinceStart / 30) * 100), 100);
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
          <h1 className="text-2xl font-bold text-gray-900">Email Warming</h1>
          <p className="text-gray-500 mt-1">Gradually warm up your email accounts to improve deliverability</p>
        </div>
      </div>

      {/* How it works */}
      <Card className="mb-8 bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
        <div className="flex items-start gap-4">
          <Flame className="w-8 h-8 text-orange-500 mt-1" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">How Email Warming Works</h3>
            <p className="text-sm text-gray-600">
              Email warming gradually increases your sending volume over 30 days, starting with 2 emails/day.
              This builds your sender reputation with email providers, improving deliverability rates and
              reducing the chance of landing in spam folders.
            </p>
            <div className="flex gap-6 mt-3 text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>~30 day process</span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <TrendingUp className="w-4 h-4" />
                <span>Gradual increase</span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Mail className="w-4 h-4" />
                <span>Auto send & reply</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {accounts.length === 0 ? (
        <Card className="text-center py-16">
          <Flame className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No email accounts</h3>
          <p className="text-gray-500">Add an email account first to start warming</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {accounts.map((account) => {
            const progress = calculateWarmingProgress(account);
            const logs = warmingLogs[account.id] || [];
            const totalSent = logs.reduce((sum, l) => sum + (l.emails_sent || 0), 0);
            const totalReceived = logs.reduce((sum, l) => sum + (l.emails_received || 0), 0);

            return (
              <Card key={account.id}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      account.is_warming ? "bg-orange-100" : "bg-gray-100"
                    }`}>
                      <Flame className={`w-6 h-6 ${account.is_warming ? "text-orange-500" : "text-gray-400"}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{account.display_name}</h3>
                      <p className="text-sm text-gray-500">{account.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={account.is_warming ? "success" : "default"}>
                      {account.is_warming ? "Warming Active" : "Not Warming"}
                    </Badge>
                    <Button
                      variant={account.is_warming ? "danger" : "primary"}
                      size="sm"
                      onClick={() => toggleWarming(account)}
                      loading={togglingId === account.id}
                    >
                      {account.is_warming ? (
                        <><Square className="w-4 h-4 mr-1" /> Stop</>
                      ) : (
                        <><Play className="w-4 h-4 mr-1" /> Start Warming</>
                      )}
                    </Button>
                  </div>
                </div>

                {account.is_warming && (
                  <>
                    {/* Progress bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">Warming Progress</span>
                        <span className="text-sm font-medium text-gray-900">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-gray-900">{account.warming_current_limit || 2}</p>
                        <p className="text-xs text-gray-500">Current daily limit</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-gray-900">{account.warming_daily_increase || 2}</p>
                        <p className="text-xs text-gray-500">Daily increase</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-blue-600">{totalSent}</p>
                        <p className="text-xs text-gray-500">Emails sent</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-green-600">{totalReceived}</p>
                        <p className="text-xs text-gray-500">Replies received</p>
                      </div>
                    </div>

                    {/* Recent Logs */}
                    {logs.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Activity</h4>
                        <div className="space-y-1">
                          {logs.slice(0, 7).map((log) => (
                            <div key={log.id} className="flex items-center justify-between text-sm py-1">
                              <span className="text-gray-500">{new Date(log.date).toLocaleDateString()}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-blue-600">{log.emails_sent} sent</span>
                                <span className="text-green-600">{log.emails_received} received</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
