import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { PersonalSecretEditorDialog } from "../src/App";
import { markdownToHtml } from "../src/utils/markdown";
import type { PersonalSecretDraft, PersonalSecretItem } from "../src/types";
import "katex/dist/katex.min.css";
import "../src/styles.css";

const emptyDraft: PersonalSecretDraft = { system_name: "测试机密", login_url: "", username: "", password: "", notes: "", tags: "" };
const item: PersonalSecretItem = { id: 1, system_name: "测试机密", login_url: null, username_preview: null, notes_preview: null, tags: null, has_username: false, has_password: false, has_notes: false, created_at: null, updated_at: null };

function Fixture() {
  const [draft, setDraft] = useState(emptyDraft);
  const [selectedItem, setSelectedItem] = useState<PersonalSecretItem | null>(item);
  const [open, setOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotes, setSavedNotes] = useState<string | null>(null);
  Object.assign(window, { secretEditorTest: {
    markdownToHtml, setSaving, setDeleting, setError,
    savedNotes, draft,
    changeRecord: () => { setSelectedItem({ ...item, id: 2 }); setDraft({ ...emptyDraft, notes: "另一条备注" }); },
  } });
  return <>
    <button onClick={() => setOpen(true)}>打开编辑</button>
    <button onClick={() => { setSelectedItem(null); setDraft({ ...emptyDraft, system_name: "" }); setOpen(true); }}>新增</button>
    <PersonalSecretEditorDialog draft={draft} selectedItem={selectedItem} isOpen={open} isSaving={saving} isDeleting={deleting} saveError={error}
      onDraftChange={setDraft} onClose={() => setOpen(false)} onDelete={() => setDeleting(true)}
      onSave={() => { setSavedNotes(draft.notes); setSaving(true); }} />
  </>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><Fixture /></React.StrictMode>);
