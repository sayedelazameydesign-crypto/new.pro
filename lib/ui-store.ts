// ===== حالة الواجهة (zustand) — المرحلة D1 (Core Validation) =====
// بنية تمهيدية للدولة القابلة للتشارك بين مكونات العميل.
// القاعدة: لا ننقل أي حالة قائمة من useState — نضيف فقط القديم الجديد الحقيقي.

import { create } from "zustand";

export interface Toast {
  id: string;
  kind: "info" | "error" | "success";
  text: string;
}

interface UiState {
  /** إشعارات عابرة (توست) — بديل مركزي لرسائل الخطأ المتفرقة لاحقًا */
  toasts: Toast[];
  pushToast: (kind: Toast["kind"], text: string) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

let seq = 0;

export const useUiStore = create<UiState>()((set) => ({
  toasts: [],
  pushToast: (kind, text) =>
    set((s) => {
      const id = `t${Date.now()}-${seq++}`;
      return { toasts: [...s.toasts.slice(-3), { id, kind, text }] }; // كحد أقصى 4 ظاهرة
    }),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clearToasts: () => set({ toasts: [] }),
}));

/** استهلاك التوست مع إزالة ذاتية بعد مهلة (يعمل فقط في المتصفح) */
export function autoDismissToast(id: string, ms = 5000): void {
  if (typeof window === "undefined") return;
  setTimeout(() => useUiStore.getState().dismissToast(id), ms);
}
