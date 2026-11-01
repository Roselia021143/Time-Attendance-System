"use client";
import type { Profile } from "@/lib/client";

/** ค้นหาจากชื่อ นามสกุล ชื่อเล่น username */
export const matchUser = (u: Profile, q: string) =>
  !q || `${u.firstName} ${u.lastName} ${u.nickname} ${u.username}`.toLowerCase().includes(q.trim().toLowerCase());

export function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input className="input w-48 py-1.5 text-sm" type="search" placeholder="ค้นหาชื่อ…" aria-label="ค้นหาพนักงาน"
      value={value} onChange={(e) => onChange(e.target.value)} />
  );
}
