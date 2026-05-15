import { useState, useEffect, useRef } from "react";
import { ChevronLeft, Search, Plus, Trash2, Pencil, X } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { PageTransition } from "@/components/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { addPoints } from "@/lib/points";
import { useToast } from "@/hooks/use-toast";

// ── Types ──────────────────────────────────────────────────────────────────────
type Entry = {
  id: string;
  title: string;
  content: string;
  mood_tag: string | null;
  created_at: string;
  updated_at: string;
};

// ── Constants ──────────────────────────────────────────────────────────────────
const PROMPTS = [
  "How are you feeling today? 💜",
  "What's been on your mind lately? 🌙",
  "What made you smile today? 🌸",
  "What do you need right now? ✨",
  "How did today make you feel? 🌿",
  "What are you grateful for? 💫",
];

const MOOD_TAGS = [
  { value: "calm",       emoji: "🌿", label: "Calm",       color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0" },
  { value: "happy",      emoji: "☀️", label: "Happy",      color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  { value: "reflective", emoji: "🌙", label: "Reflective", color: "#818cf8", bg: "#eef2ff", border: "#c7d2fe" },
  { value: "anxious",    emoji: "🌊", label: "Anxious",    color: "#38bdf8", bg: "#f0f9ff", border: "#bae6fd" },
  { value: "emotional",  emoji: "💧", label: "Emotional",  color: "#f472b6", bg: "#fdf2f8", border: "#fbcfe8" },
  { value: "tired",      emoji: "🌸", label: "Tired",      color: "#a78bfa", bg: "#f5f3ff", border: "#ddd6fe" },
];

function getMoodTag(value: string | null) {
  return MOOD_TAGS.find((t) => t.value === value) ?? null;
}

// ── Rotating prompt ────────────────────────────────────────────────────────────
function RotatingPrompt({ onUse }: { onUse: (text: string) => void }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % PROMPTS.length), 4500);
    return () => clearInterval(t);
  }, []);
  return (
    <div
      className="rounded-3xl p-5 flex flex-col gap-3"
      style={{ background: "linear-gradient(135deg, #F5F3FF 0%, #FFF0F9 100%)", border: "1px solid #EDE9FE" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400">Reflection prompt</p>
      <AnimatePresence mode="wait">
        <motion.p
          key={idx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.4 }}
          className="text-sm font-medium text-purple-800 leading-relaxed"
        >
          {PROMPTS[idx]}
        </motion.p>
      </AnimatePresence>
      <button
        onClick={() => onUse(PROMPTS[idx]!.replace(/ [^\s]+$/, ""))}
        className="self-start text-[11px] font-semibold text-purple-500 bg-white/80 border border-purple-100 rounded-xl px-3 py-1.5 active:scale-95 transition-transform"
      >
        Write about this →
      </button>
    </div>
  );
}

// ── Entry card ─────────────────────────────────────────────────────────────────
function EntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: Entry;
  onEdit: (e: Entry) => void;
  onDelete: (id: string) => void;
}) {
  const tag = getMoodTag(entry.mood_tag);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-3xl p-5 shadow-sm border border-card-border flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{entry.title || "Untitled"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(entry.created_at), "MMM d, yyyy · h:mm a")}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(entry)}
            className="w-8 h-8 rounded-2xl bg-purple-50 flex items-center justify-center active:scale-90 transition-transform"
          >
            <Pencil className="w-3.5 h-3.5 text-purple-400" />
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className="w-8 h-8 rounded-2xl bg-rose-50 flex items-center justify-center active:scale-90 transition-transform"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
          </button>
        </div>
      </div>

      {entry.content && (
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{entry.content}</p>
      )}

      {tag && (
        <div
          className="self-start flex items-center gap-1.5 rounded-xl px-2.5 py-1"
          style={{ background: tag.bg, border: `1px solid ${tag.border}` }}
        >
          <span className="text-xs">{tag.emoji}</span>
          <span className="text-[11px] font-semibold" style={{ color: tag.color }}>{tag.label}</span>
        </div>
      )}
    </motion.div>
  );
}

// ── Entry form (bottom sheet) ──────────────────────────────────────────────────
function EntryForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Entry | null;
  onSave: (data: { title: string; content: string; mood_tag: string | null }) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [moodTag, setMoodTag] = useState<string | null>(initial?.mood_tag ?? null);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 200);
  }, []);

  const handleSave = async () => {
    if (!content.trim() && !title.trim()) return;
    setSaving(true);
    await onSave({ title: title.trim(), content: content.trim(), mood_tag: moodTag });
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center"
    >
      <div
        className="w-full max-w-[430px] rounded-t-3xl flex flex-col"
        style={{
          background: "linear-gradient(180deg, #FFF7FB 0%, #F6F0FF 100%)",
          boxShadow: "0 -8px 40px rgba(167,139,250,0.18)",
          maxHeight: "88vh",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-purple-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4">
          <h2 className="text-base font-semibold text-foreground">
            {initial ? "Edit reflection" : "New reflection"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-2xl bg-white/80 flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6 flex flex-col gap-4">
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give this a title… (optional)"
            maxLength={80}
            className="w-full text-sm font-medium bg-white border border-purple-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200 text-foreground placeholder:text-muted-foreground/60"
          />

          {/* Content */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Pour your thoughts here… This is only for you 💜"
            rows={7}
            className="w-full text-sm bg-white border border-purple-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200 resize-none text-foreground placeholder:text-muted-foreground/60 leading-relaxed"
          />

          {/* Mood tag */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">
              How are you feeling?
            </p>
            <div className="flex flex-wrap gap-2">
              {MOOD_TAGS.map((tag) => {
                const active = moodTag === tag.value;
                return (
                  <button
                    key={tag.value}
                    onClick={() => setMoodTag(active ? null : tag.value)}
                    className="flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-[11px] font-semibold transition-all active:scale-95"
                    style={{
                      background: active ? tag.bg : "#F9F9F9",
                      border: `1.5px solid ${active ? tag.border : "#E5E7EB"}`,
                      color: active ? tag.color : "#9CA3AF",
                    }}
                  >
                    <span>{tag.emoji}</span>
                    <span>{tag.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving || (!content.trim() && !title.trim())}
            className="w-full py-3.5 rounded-2xl text-white text-sm font-semibold shadow-md active:scale-[0.98] transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #C4B5FD, #F9A8D4)" }}
          >
            {saving ? "Saving…" : "Save reflection"}
          </button>

          <p className="text-center text-[10px] text-muted-foreground/60">
            Only you can see this 💜
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function PrivateSpace() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  // ── Load entries ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("private_space_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setEntries((data ?? []) as Entry[]);
        setLoading(false);
      });
  }, [user?.id]);

  // ── Create ───────────────────────────────────────────────────────────────────
  const handleCreate = async (data: { title: string; content: string; mood_tag: string | null }) => {
    if (!user?.id) return;
    const { data: row } = await supabase
      .from("private_space_entries")
      .insert({ user_id: user.id, ...data })
      .select()
      .single();
    if (row) {
      setEntries((prev) => [row as Entry, ...prev]);
      setShowForm(false);
      toast({ title: "Reflection saved 💜", description: "A safe space for your thoughts 🌙" });
      // Award points (fire-and-forget)
      addPoints(user.id, "private_space").then(({ awarded, bonus }) => {
        if (awarded) {
          toast({
            title: `+4 Luna Points earned 💜`,
            description: bonus > 0 ? `Streak bonus: +${bonus} pts! 🔥` : "Journaling is self-care 🌸",
          });
        }
      }).catch(() => {});
    }
  };

  // ── Update ───────────────────────────────────────────────────────────────────
  const handleUpdate = async (data: { title: string; content: string; mood_tag: string | null }) => {
    if (!editing) return;
    const now = new Date().toISOString();
    const { data: row } = await supabase
      .from("private_space_entries")
      .update({ ...data, updated_at: now })
      .eq("id", editing.id)
      .select()
      .single();
    if (row) {
      setEntries((prev) => prev.map((e) => (e.id === editing.id ? (row as Entry) : e)));
      setEditing(null);
      toast({ title: "Reflection updated 🌸" });
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    await supabase.from("private_space_entries").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    toast({ title: "Entry removed", description: "Your space, your choice 💜" });
  };

  const openEdit = (entry: Entry) => {
    setEditing(entry);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const filtered = entries.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.content.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <PageTransition className="flex flex-col min-h-screen pb-24">
      {/* Header */}
      <header
        className="px-5 pt-12 pb-5 sticky top-0 z-10 backdrop-blur-md"
        style={{ background: "linear-gradient(180deg, #FFF7FB 90%, transparent)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => setLocation("/")}
            className="w-9 h-9 rounded-2xl bg-white shadow-sm border border-card-border flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <button
            onClick={() => setShowSearch((s) => !s)}
            className="w-9 h-9 rounded-2xl bg-white shadow-sm border border-card-border flex items-center justify-center"
          >
            <Search className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="mt-3">
          <h1 className="text-2xl font-semibold text-foreground">Private Space</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your thoughts are safe here 💜</p>
        </div>

        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden"
            >
              <div className="flex items-center gap-2 bg-white border border-purple-100 rounded-2xl px-3 py-2.5">
                <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search your reflections…"
                  className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/60"
                />
                {search && (
                  <button onClick={() => setSearch("")}>
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1 px-5 flex flex-col gap-4">
        {/* Rotating prompt — only when no search */}
        {!search && (
          <RotatingPrompt
            onUse={(text) => {
              setEditing(null);
              setShowForm(true);
            }}
          />
        )}

        {/* Safe space note */}
        {!search && entries.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3 py-10 text-center"
          >
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #EDE9FE, #FDF2F8)" }}
            >
              <span className="text-4xl">🌸</span>
            </div>
            <p className="text-base font-semibold text-foreground">A quiet place for your reflections</p>
            <p className="text-sm text-muted-foreground max-w-[240px] leading-relaxed">
              A safe space for your thoughts 🌙<br />Only you can see this.
            </p>
          </motion.div>
        )}

        {/* Search empty state */}
        {search && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm text-muted-foreground">No reflections found for "{search}"</p>
          </div>
        )}

        {/* Entries */}
        <AnimatePresence>
          {(search ? filtered : entries).map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </AnimatePresence>
      </main>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => { setEditing(null); setShowForm(true); }}
        className="fixed bottom-8 right-5 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg z-40"
        style={{ background: "linear-gradient(135deg, #C4B5FD, #F9A8D4)" }}
      >
        <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
      </motion.button>

      {/* Backdrop + Form */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              ref={backdropRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeForm}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            />
            <EntryForm
              initial={editing}
              onSave={editing ? handleUpdate : handleCreate}
              onClose={closeForm}
            />
          </>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
