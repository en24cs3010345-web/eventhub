import { createContext, useContext, useState, useCallback } from 'react';
const Ctx = createContext(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const toast = useCallback((message, type = 'success') => {
    const id = Math.random();
    setItems((s) => [...s, { id, message, type }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${t.type === 'error' ? 'bg-red-600 text-white' : 'bg-ink text-bg'}`}>{t.message}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
