"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Upload, Search, Trash2, Tag, Users } from "lucide-react";
import Card, { CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import pb from "@/lib/pocketbase";
import type { Contact, ContactList } from "@/types";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"contacts" | "lists">("contacts");

  // New contact form
  const [newEmail, setNewEmail] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newTitle, setNewTitle] = useState("");

  // New list form
  const [newListName, setNewListName] = useState("");
  const [newListDesc, setNewListDesc] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const contactResult = await pb.collection("contacts").getList(1, 100, { sort: "-created" });
      setContacts(contactResult.items as unknown as Contact[]);

      const listResult = await pb.collection("contact_lists").getList(1, 100, { sort: "-created" });
      setLists(listResult.items as unknown as ContactList[]);
    } catch {
      // PocketBase not available
    } finally {
      setLoading(false);
    }
  }

  async function addContact(e: React.FormEvent) {
    e.preventDefault();
    try {
      await pb.collection("contacts").create({
        email: newEmail,
        first_name: newFirstName,
        last_name: newLastName,
        company: newCompany,
        title: newTitle,
        status: "active",
        tags: [],
        custom_fields: {},
        user_id: pb.authStore.record?.id,
      });
      setShowAddModal(false);
      setNewEmail("");
      setNewFirstName("");
      setNewLastName("");
      setNewCompany("");
      setNewTitle("");
      loadData();
    } catch {
      alert("Failed to add contact");
    }
  }

  async function createList(e: React.FormEvent) {
    e.preventDefault();
    try {
      await pb.collection("contact_lists").create({
        name: newListName,
        description: newListDesc,
        contact_count: 0,
        user_id: pb.authStore.record?.id,
      });
      setShowListModal(false);
      setNewListName("");
      setNewListDesc("");
      loadData();
    } catch {
      alert("Failed to create list");
    }
  }

  async function deleteContact(id: string) {
    if (!confirm("Delete this contact?")) return;
    try {
      await pb.collection("contacts").delete(id);
      loadData();
    } catch {
      alert("Failed to delete contact");
    }
  }

  const filtered = contacts.filter(
    (c) =>
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-500 mt-1">Manage your contacts and lists</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/contacts/import">
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
          </Link>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "contacts" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
          }`}
          onClick={() => setActiveTab("contacts")}
        >
          <Users className="w-4 h-4 inline mr-1" />
          Contacts ({contacts.length})
        </button>
        <button
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "lists" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
          }`}
          onClick={() => setActiveTab("lists")}
        >
          <Tag className="w-4 h-4 inline mr-1" />
          Lists ({lists.length})
        </button>
      </div>

      {activeTab === "contacts" ? (
        <>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <Card padding={false}>
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
                <p className="text-gray-500 mb-4">Import a CSV or add contacts manually</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Company</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Title</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((contact) => (
                      <tr key={contact.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">
                          {contact.first_name} {contact.last_name}
                        </td>
                        <td className="py-3 px-4 text-gray-600">{contact.email}</td>
                        <td className="py-3 px-4 text-gray-600">{contact.company}</td>
                        <td className="py-3 px-4 text-gray-600">{contact.title}</td>
                        <td className="py-3 px-4">
                          <Badge variant={contact.status === "active" ? "success" : contact.status === "bounced" ? "danger" : "warning"}>
                            {contact.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <button onClick={() => deleteContact(contact.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowListModal(true)} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" /> New List
            </Button>
          </div>
          {lists.length === 0 ? (
            <Card className="text-center py-16">
              <Tag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No contact lists</h3>
              <p className="text-gray-500">Create a list to organize your contacts</p>
            </Card>
          ) : (
            lists.map((list) => (
              <Card key={list.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{list.name}</h3>
                    <p className="text-sm text-gray-500">{list.description || "No description"}</p>
                  </div>
                  <Badge>{list.contact_count || 0} contacts</Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Add Contact Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Contact">
        <form onSubmit={addContact} className="space-y-4">
          <Input id="email" label="Email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
          <div className="grid grid-cols-2 gap-4">
            <Input id="firstName" label="First Name" value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} />
            <Input id="lastName" label="Last Name" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} />
          </div>
          <Input id="company" label="Company" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} />
          <Input id="title" label="Job Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit">Add Contact</Button>
          </div>
        </form>
      </Modal>

      {/* Create List Modal */}
      <Modal isOpen={showListModal} onClose={() => setShowListModal(false)} title="Create Contact List">
        <form onSubmit={createList} className="space-y-4">
          <Input id="listName" label="List Name" value={newListName} onChange={(e) => setNewListName(e.target.value)} required />
          <Input id="listDesc" label="Description" value={newListDesc} onChange={(e) => setNewListDesc(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowListModal(false)}>Cancel</Button>
            <Button type="submit">Create List</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
