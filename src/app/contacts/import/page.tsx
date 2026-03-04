"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import Card, { CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import Select from "@/components/ui/select";
import pb from "@/lib/pocketbase";
import Papa from "papaparse";

interface CSVRow {
  [key: string]: string;
}

export default function ImportContactsPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [lists, setLists] = useState<{ value: string; label: string }[]>([]);
  const [selectedList, setSelectedList] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [step, setStep] = useState<"upload" | "map" | "import" | "done">("upload");

  const fields = [
    { value: "", label: "Skip this column" },
    { value: "email", label: "Email" },
    { value: "first_name", label: "First Name" },
    { value: "last_name", label: "Last Name" },
    { value: "company", label: "Company" },
    { value: "title", label: "Job Title" },
    { value: "phone", label: "Phone" },
  ];

  useEffect(() => {
    loadLists();
  }, []);

  const autoMapHeaders = useCallback((hdrs: string[]) => {
    const autoMap: Record<string, string> = {};
    const mappings: Record<string, string[]> = {
      email: ["email", "e-mail", "email_address", "emailaddress"],
      first_name: ["first_name", "firstname", "first name", "first", "given_name"],
      last_name: ["last_name", "lastname", "last name", "last", "surname", "family_name"],
      company: ["company", "company_name", "organization", "org"],
      title: ["title", "job_title", "jobtitle", "position", "role"],
      phone: ["phone", "phone_number", "telephone", "tel", "mobile"],
    };

    for (const header of hdrs) {
      const lower = header.toLowerCase().trim();
      for (const [field, aliases] of Object.entries(mappings)) {
        if (aliases.includes(lower)) {
          autoMap[header] = field;
          break;
        }
      }
    }
    return autoMap;
  }, []);

  async function loadLists() {
    try {
      const result = await pb.collection("contact_lists").getList(1, 100);
      setLists(result.items.map((l) => ({ value: l.id, label: l.name })));
    } catch {
      // handle error
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const data = result.data as CSVRow[];
        setCsvData(data);
        if (data.length > 0) {
          const hdrs = Object.keys(data[0]);
          setHeaders(hdrs);
          setMapping(autoMapHeaders(hdrs));
          setStep("map");
        }
      },
      error: () => {
        alert("Failed to parse CSV file");
      },
    });
  }

  async function handleImport() {
    setImporting(true);
    setStep("import");
    let success = 0;
    let failed = 0;

    for (const row of csvData) {
      try {
        const contact: Record<string, unknown> = {
          status: "active",
          tags: [],
          custom_fields: {},
          user_id: pb.authStore.record?.id,
        };

        // Map fields
        for (const [header, field] of Object.entries(mapping)) {
          if (field && row[header]) {
            contact[field] = row[header].trim();
          }
        }

        // Collect unmapped fields as custom_fields
        const customFields: Record<string, string> = {};
        for (const header of headers) {
          if (!mapping[header] && row[header]) {
            customFields[header] = row[header].trim();
          }
        }
        if (Object.keys(customFields).length > 0) {
          contact.custom_fields = customFields;
        }

        if (!contact.email) {
          failed++;
          continue;
        }

        const created = await pb.collection("contacts").create(contact);

        // Add to list if selected
        if (selectedList) {
          await pb.collection("contact_list_members").create({
            contact_list_id: selectedList,
            contact_id: created.id,
          });
        }

        success++;
      } catch {
        failed++;
      }
    }

    // Update list contact count
    if (selectedList) {
      try {
        const members = await pb.collection("contact_list_members").getList(1, 1, {
          filter: `contact_list_id = "${selectedList}"`,
        });
        await pb.collection("contact_lists").update(selectedList, {
          contact_count: members.totalItems,
        });
      } catch {
        // ignore
      }
    }

    setImportResult({ success, failed });
    setStep("done");
    setImporting(false);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/contacts">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Contacts</h1>
          <p className="text-gray-500 mt-1">Upload a CSV file to import contacts</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        {["Upload CSV", "Map Fields", "Import", "Done"].map((s, i) => {
          const steps = ["upload", "map", "import", "done"];
          const isActive = steps.indexOf(step) >= i;
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                isActive ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
              }`}>
                {i + 1}
              </div>
              <span className={`text-sm ${isActive ? "text-gray-900" : "text-gray-400"}`}>{s}</span>
              {i < 3 && <div className={`w-8 h-0.5 ${isActive ? "bg-blue-600" : "bg-gray-200"}`} />}
            </div>
          );
        })}
      </div>

      {step === "upload" && (
        <Card>
          <CardHeader><CardTitle>Upload CSV File</CardTitle></CardHeader>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
            <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600 mb-4">
              Upload a CSV file with your contacts. Supported columns: email, first_name, last_name, company, title, phone
            </p>
            <label className="cursor-pointer">
              <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
              <Button variant="outline" className="pointer-events-none">
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
            </label>
            {file && <p className="mt-3 text-sm text-gray-500">{file.name}</p>}
          </div>
        </Card>
      )}

      {step === "map" && (
        <Card>
          <CardHeader>
            <CardTitle>Map CSV Columns ({csvData.length} rows found)</CardTitle>
          </CardHeader>
          <div className="space-y-4 mb-6">
            <Select
              id="list"
              label="Add to Contact List (optional)"
              options={[{ value: "", label: "No list" }, ...lists]}
              value={selectedList}
              onChange={(e) => setSelectedList(e.target.value)}
            />
          </div>
          <div className="space-y-3">
            {headers.map((header) => (
              <div key={header} className="flex items-center gap-4">
                <span className="w-40 text-sm font-medium text-gray-700 truncate">{header}</span>
                <span className="text-gray-400">→</span>
                <Select
                  options={fields}
                  value={mapping[header] || ""}
                  onChange={(e) => setMapping({ ...mapping, [header]: e.target.value })}
                />
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="mt-6 border rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b">
                  {headers.map((h) => (
                    <th key={h} className="py-2 px-3 text-left font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvData.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {headers.map((h) => (
                      <td key={h} className="py-2 px-3 text-gray-600 truncate max-w-[150px]">{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="secondary" onClick={() => setStep("upload")}>Back</Button>
            <Button onClick={handleImport} disabled={!mapping.email && !Object.values(mapping).includes("email")}>
              Import {csvData.length} Contacts
            </Button>
          </div>
        </Card>
      )}

      {step === "import" && (
        <Card className="text-center py-16">
          <div className="animate-spin w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <h3 className="text-lg font-medium">Importing contacts...</h3>
          <p className="text-gray-500 mt-1">This may take a moment</p>
        </Card>
      )}

      {step === "done" && importResult && (
        <Card className="text-center py-16">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Import Complete</h3>
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">{importResult.success} imported</span>
            </div>
            {importResult.failed > 0 && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">{importResult.failed} failed</span>
              </div>
            )}
          </div>
          <Button onClick={() => router.push("/contacts")}>View Contacts</Button>
        </Card>
      )}
    </div>
  );
}
