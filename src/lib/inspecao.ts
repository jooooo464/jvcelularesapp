/** Campos do checklist de estado do aparelho (chave da coluna → rótulo). */
export const CHECKLIST_CAMPOS = [
  { key: "tela_quebrada", label: "Tela quebrada" },
  { key: "tampa_quebrada", label: "Tampa traseira quebrada" },
  { key: "carcaca_amassada", label: "Carcaça amassada" },
  { key: "arranhoes", label: "Arranhões" },
  { key: "oxidacao", label: "Oxidação" },
  { key: "marcas_queda", label: "Marcas de queda" },
  { key: "aparelho_molhado", label: "Aparelho molhado" },
  { key: "botoes_danificados", label: "Botões danificados" },
  { key: "conector_defeito", label: "Conector com defeito" },
  { key: "alto_falante_defeito", label: "Alto-falante com defeito" },
  { key: "microfone_defeito", label: "Microfone com defeito" },
  { key: "camera_danificada", label: "Câmera danificada" },
  { key: "biometria_funcionando", label: "Biometria funcionando" },
  { key: "faceid_funcionando", label: "Face ID funcionando (iPhone)" },
  { key: "touch_funcionando", label: "Touch funcionando" },
  { key: "lcd_funcionando", label: "LCD funcionando" },
  { key: "liga_normalmente", label: "Liga normalmente" },
  { key: "nao_liga", label: "Não liga" },
  { key: "reiniciando", label: "Reiniciando" },
] as const;

export type ChecklistKey = (typeof CHECKLIST_CAMPOS)[number]["key"];

export const ACESSORIOS_PADRAO = [
  "Chip SIM",
  "Cartão de memória",
  "Capinha",
  "Película",
  "Carregador",
  "Cabo USB",
  "Fonte",
  "Caixa original",
  "Fone de ouvido",
];

/** Etapas sugeridas para organizar as fotos do aparelho. */
export const ETAPAS_FOTO = [
  "Inspeção inicial",
  "Parte frontal",
  "Parte traseira",
  "Laterais",
  "Parte superior",
  "Parte inferior",
  "Tela ligada",
  "Tela desligada",
  "IMEI",
  "Etiquetas",
  "Danos existentes",
  "Acessórios entregues",
  "Antes do reparo",
  "Defeito encontrado",
  "Peça danificada",
  "Peça nova instalada",
  "Durante a manutenção",
  "Testes finais",
  "Aparelho finalizado",
  "Outros detalhes",
];

export const checklistVazio = () =>
  Object.fromEntries(CHECKLIST_CAMPOS.map((c) => [c.key, false])) as Record<ChecklistKey, boolean>;
