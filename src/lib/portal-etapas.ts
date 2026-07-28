export const ETAPAS = [
  "Aparelho recebido",
  "Cadastro realizado",
  "Em análise",
  "Diagnóstico concluído",
  "Aguardando aprovação do orçamento",
  "Aguardando chegada da peça",
  "Em manutenção",
  "Testes finais",
  "Pronto para retirada",
  "Entregue",
] as const;

export type Etapa = (typeof ETAPAS)[number];

/** Índice mínimo da etapa atual conforme o status da OS. */
export function etapaDoStatus(status: string, orcamento: string): number {
  const base: Record<string, number> = {
    Recebido: 1,
    "Em análise": 2,
    "Aguardando peça": 5,
    "Em manutenção": 6,
    Pronto: 8,
    Entregue: 9,
  };
  let idx = base[status] ?? 0;
  if (status === "Em análise" && orcamento === "Pendente") idx = 4;
  if (status === "Em análise" && orcamento === "Aprovado") idx = Math.max(idx, 5);
  return idx;
}

export const SUGESTOES = [
  "Aparelho recebido",
  "Defeito identificado",
  "Orçamento enviado",
  "Cliente aprovou o orçamento",
  "Peça solicitada",
  "Peça recebida",
  "Reparo iniciado",
  "Troca da tela concluída",
  "Troca da bateria concluída",
  "Testes realizados",
  "Reparo finalizado",
  "Aguardando retirada",
  "Serviço entregue",
];

export const mascararImei = (imei?: string | null) =>
  imei ? `${imei.slice(0, 4)}${"•".repeat(Math.max(imei.length - 8, 0))}${imei.slice(-4)}` : null;
