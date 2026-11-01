"use client";
import { Search } from "lucide-react";
import type { Profile } from "@/lib/client";

/** ค้นหาจากชื่อ นามสกุล ชื่อเล่น username */
export const matchUser = (u: Profile, q: string) =>
  !q || `${u.firstName} ${u.lastName} ${u.nickname} ${u.username}`.toLowerCase().includes(q.trim().toLowerCase());

export function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <span className="relative">
      <Search size={16} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input className="input w-48 py-1.5 pl-8 text-sm" type="search" placeholder="ค้นหาชื่อ…" aria-label="ค้นหาพนักงาน"
        value={value} onChange={(e) => onChange(e.target.value)} />
    </span>
  );
}
