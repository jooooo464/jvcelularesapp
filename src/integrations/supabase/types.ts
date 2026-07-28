export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      aparelhos: {
        Row: {
          cliente_id: string
          cor: string | null
          created_at: string
          id: string
          imei: string | null
          marca: string
          modelo: string
          observacoes: string | null
          senha: string | null
        }
        Insert: {
          cliente_id: string
          cor?: string | null
          created_at?: string
          id?: string
          imei?: string | null
          marca: string
          modelo: string
          observacoes?: string | null
          senha?: string | null
        }
        Update: {
          cliente_id?: string
          cor?: string | null
          created_at?: string
          id?: string
          imei?: string | null
          marca?: string
          modelo?: string
          observacoes?: string | null
          senha?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aparelhos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      atualizacoes_os: {
        Row: {
          created_at: string
          descricao: string | null
          foto_url: string | null
          id: string
          ordem_servico_id: string
          status: string | null
          titulo: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          foto_url?: string | null
          id?: string
          ordem_servico_id: string
          status?: string | null
          titulo: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          foto_url?: string | null
          id?: string
          ordem_servico_id?: string
          status?: string | null
          titulo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atualizacoes_os_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atualizacoes_os_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          created_at: string
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["categoria_tipo"]
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          tipo: Database["public"]["Enums"]["categoria_tipo"]
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["categoria_tipo"]
        }
        Relationships: []
      }
      clientes: {
        Row: {
          cidade: string | null
          cpf: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          whatsapp: string | null
        }
        Insert: {
          cidade?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          whatsapp?: string | null
        }
        Update: {
          cidade?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      financeiro: {
        Row: {
          categoria: string | null
          created_at: string
          descricao: string
          id: string
          os_id: string | null
          status: Database["public"]["Enums"]["financeiro_status"]
          tipo: Database["public"]["Enums"]["financeiro_tipo"]
          valor: number
          vencimento: string
          venda_id: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          descricao: string
          id?: string
          os_id?: string | null
          status?: Database["public"]["Enums"]["financeiro_status"]
          tipo: Database["public"]["Enums"]["financeiro_tipo"]
          valor?: number
          vencimento?: string
          venda_id?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string
          descricao?: string
          id?: string
          os_id?: string | null
          status?: Database["public"]["Enums"]["financeiro_status"]
          tipo?: Database["public"]["Enums"]["financeiro_tipo"]
          valor?: number
          vencimento?: string
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          cidade: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
        }
        Update: {
          cidade?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      itens_venda: {
        Row: {
          custo_unitario: number
          id: string
          produto_id: string | null
          quantidade: number
          valor_unitario: number
          venda_id: string
        }
        Insert: {
          custo_unitario?: number
          id?: string
          produto_id?: string | null
          quantidade?: number
          valor_unitario?: number
          venda_id: string
        }
        Update: {
          custo_unitario?: number
          id?: string
          produto_id?: string | null
          quantidade?: number
          valor_unitario?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_venda_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_venda_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_auditoria: {
        Row: {
          created_at: string
          dados: Json | null
          id: string
          operacao: string
          registro_id: string | null
          tabela: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dados?: Json | null
          id?: string
          operacao: string
          registro_id?: string | null
          tabela: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dados?: Json | null
          id?: string
          operacao?: string
          registro_id?: string | null
          tabela?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ordens_servico: {
        Row: {
          aparelho_id: string | null
          cliente_id: string
          created_at: string
          data_entrada: string
          data_entrega: string | null
          defeito: string
          desconto: number
          diagnostico: string | null
          fotos: string[]
          id: string
          numero_os: number
          orcamento_dispositivo: string | null
          orcamento_ip: string | null
          orcamento_resposta_em: string | null
          orcamento_status: string
          portal_ativo: boolean
          portal_criado_em: string
          portal_link: string | null
          portal_token: string
          previsao_entrega: string | null
          servico_realizado: string | null
          status: Database["public"]["Enums"]["os_status"]
          tecnico_id: string | null
          valor_pecas: number
          valor_servico: number
          valor_total: number
        }
        Insert: {
          aparelho_id?: string | null
          cliente_id: string
          created_at?: string
          data_entrada?: string
          data_entrega?: string | null
          defeito?: string
          desconto?: number
          diagnostico?: string | null
          fotos?: string[]
          id?: string
          numero_os?: number
          orcamento_dispositivo?: string | null
          orcamento_ip?: string | null
          orcamento_resposta_em?: string | null
          orcamento_status?: string
          portal_ativo?: boolean
          portal_criado_em?: string
          portal_link?: string | null
          portal_token?: string
          previsao_entrega?: string | null
          servico_realizado?: string | null
          status?: Database["public"]["Enums"]["os_status"]
          tecnico_id?: string | null
          valor_pecas?: number
          valor_servico?: number
          valor_total?: number
        }
        Update: {
          aparelho_id?: string | null
          cliente_id?: string
          created_at?: string
          data_entrada?: string
          data_entrega?: string | null
          defeito?: string
          desconto?: number
          diagnostico?: string | null
          fotos?: string[]
          id?: string
          numero_os?: number
          orcamento_dispositivo?: string | null
          orcamento_ip?: string | null
          orcamento_resposta_em?: string | null
          orcamento_status?: string
          portal_ativo?: boolean
          portal_criado_em?: string
          portal_link?: string | null
          portal_token?: string
          previsao_entrega?: string | null
          servico_realizado?: string | null
          status?: Database["public"]["Enums"]["os_status"]
          tecnico_id?: string | null
          valor_pecas?: number
          valor_servico?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_aparelho_id_fkey"
            columns: ["aparelho_id"]
            isOneToOne: false
            referencedRelation: "aparelhos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_codigos: {
        Row: {
          cliente_id: string
          codigo: string
          created_at: string
          expira_em: string
          id: string
          identificador: string
          usado: boolean
        }
        Insert: {
          cliente_id: string
          codigo: string
          created_at?: string
          expira_em?: string
          id?: string
          identificador: string
          usado?: boolean
        }
        Update: {
          cliente_id?: string
          codigo?: string
          created_at?: string
          expira_em?: string
          id?: string
          identificador?: string
          usado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "portal_codigos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          categoria_id: string | null
          codigo_barras: string | null
          created_at: string
          estoque_minimo: number
          fornecedor_id: string | null
          id: string
          lucro_percentual: number
          lucro_reais: number
          marca: string | null
          modelo_compativel: string | null
          nome: string
          quantidade: number
          sku: string | null
          valor_compra: number
          valor_venda: number
        }
        Insert: {
          categoria_id?: string | null
          codigo_barras?: string | null
          created_at?: string
          estoque_minimo?: number
          fornecedor_id?: string | null
          id?: string
          lucro_percentual?: number
          lucro_reais?: number
          marca?: string | null
          modelo_compativel?: string | null
          nome: string
          quantidade?: number
          sku?: string | null
          valor_compra?: number
          valor_venda?: number
        }
        Update: {
          categoria_id?: string | null
          codigo_barras?: string | null
          created_at?: string
          estoque_minimo?: number
          fornecedor_id?: string | null
          id?: string
          lucro_percentual?: number
          lucro_reais?: number
          marca?: string | null
          modelo_compativel?: string | null
          nome?: string
          quantidade?: number
          sku?: string | null
          valor_compra?: number
          valor_venda?: number
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          cargo: string | null
          created_at: string
          email: string
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          email?: string
          id: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          cliente_id: string | null
          created_at: string
          desconto: number
          forma_pagamento: string
          id: string
          usuario_id: string | null
          valor_total: number
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          desconto?: number
          forma_pagamento?: string
          id?: string
          usuario_id?: string | null
          valor_total?: number
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          desconto?: number
          forma_pagamento?: string
          id?: string
          usuario_id?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "administrador" | "tecnico" | "vendedor" | "financeiro"
      categoria_tipo: "Acessórios" | "Peças"
      financeiro_status: "Pago" | "Pendente" | "Vencido"
      financeiro_tipo: "Entrada" | "Saída"
      os_status:
        | "Recebido"
        | "Em análise"
        | "Aguardando peça"
        | "Em manutenção"
        | "Pronto"
        | "Entregue"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["administrador", "tecnico", "vendedor", "financeiro"],
      categoria_tipo: ["Acessórios", "Peças"],
      financeiro_status: ["Pago", "Pendente", "Vencido"],
      financeiro_tipo: ["Entrada", "Saída"],
      os_status: [
        "Recebido",
        "Em análise",
        "Aguardando peça",
        "Em manutenção",
        "Pronto",
        "Entregue",
      ],
    },
  },
} as const
