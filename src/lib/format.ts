export const brl = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));

export const num = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR").format(Number(v ?? 0));

export const pct = (v: number | null | undefined) => `${Number(v ?? 0).toFixed(1)}%`;

export const dateBR = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—";

export const dateTimeBR = (v: string | null | undefined) =>
  v
    ? new Date(v).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const startOfMonthISO = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

export const onlyDigits = (v: string) => v.replace(/\D/g, "");
