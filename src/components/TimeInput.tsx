"use client";

/** ช่องเวลาแบบไทย 24 ชม. (HH:MM) — <input type="time"> แสดง AM/PM ตามภาษาเบราว์เซอร์ จึงไม่ใช้ */
export default function TimeInput({ className = "", allow24 = false, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { allow24?: boolean }) {
  return (
    <input
      {...p}
      className={`input tabular-nums ${className}`}
      inputMode="numeric"
      maxLength={5}
      placeholder="เช่น 09:00"
      pattern={allow24 ? "([01]\\d|2[0-3]):[0-5]\\d|24:00" : "([01]\\d|2[0-3]):[0-5]\\d"}
      title="รูปแบบ 24 ชั่วโมง เช่น 09:00 หรือ 18:30"
      // พิมพ์ 930 / 1830 / 9 แล้วจัดรูปให้เป็น 09:30 / 18:30 / 09:00
      onBlur={(e) => {
        const d = e.target.value.replace(/\D/g, "");
        if (d.length >= 1 && d.length <= 4) {
          const [h, m] = d.length <= 2 ? [d, "00"] : [d.slice(0, -2), d.slice(-2)];
          e.target.value = `${h.padStart(2, "0")}:${m}`;
        }
      }}
    />
  );
}
