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
      acessorios_entregues: {
        Row: {
          created_at: string
          entregue: boolean
          id: string
          nome_acessorio: string
          observacao: string | null
          ordem_servico_id: string
        }
        Insert: {
          created_at?: string
          entregue?: boolean
          id?: string
          nome_acessorio: string
          observacao?: string | null
          ordem_servico_id: string
        }
        Update: {
          created_at?: string
          entregue?: boolean
          id?: string
          nome_acessorio?: string
          observacao?: string | null
          ordem_servico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acessorios_entregues_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
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
      auditoria_os: {
        Row: {
          acao: string
          created_at: string
          dispositivo: string | null
          id: string
          ip: string | null
          motivo: string | null
          numero_os: number | null
          ordem_servico_id: string | null
          usuario_id: string | null
          usuario_nome: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dispositivo?: string | null
          id?: string
          ip?: string | null
          motivo?: string | null
          numero_os?: number | null
          ordem_servico_id?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dispositivo?: string | null
          id?: string
          ip?: string | null
          motivo?: string | null
          numero_os?: number | null
          ordem_servico_id?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Relationships: []
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
      checklist_aparelho: {
        Row: {
          alto_falante_defeito: boolean
          aparelho_molhado: boolean
          arranhoes: boolean
          biometria_funcionando: boolean
          botoes_danificados: boolean
          camera_danificada: boolean
          carcaca_amassada: boolean
          conector_defeito: boolean
          created_at: string
          faceid_funcionando: boolean
          id: string
          inspecionado_em: string
          lcd_funcionando: boolean
          liga_normalmente: boolean
          marcas_queda: boolean
          microfone_defeito: boolean
          nao_liga: boolean
          observacoes: string | null
          ordem_servico_id: string
          outro: string | null
          oxidacao: boolean
          reiniciando: boolean
          tampa_quebrada: boolean
          tecnico_id: string | null
          tela_quebrada: boolean
          touch_funcionando: boolean
          updated_at: string
        }
        Insert: {
          alto_falante_defeito?: boolean
          aparelho_molhado?: boolean
          arranhoes?: boolean
          biometria_funcionando?: boolean
          botoes_danificados?: boolean
          camera_danificada?: boolean
          carcaca_amassada?: boolean
          conector_defeito?: boolean
          created_at?: string
          faceid_funcionando?: boolean
          id?: string
          inspecionado_em?: string
          lcd_funcionando?: boolean
          liga_normalmente?: boolean
          marcas_queda?: boolean
          microfone_defeito?: boolean
          nao_liga?: boolean
          observacoes?: string | null
          ordem_servico_id: string
          outro?: string | null
          oxidacao?: boolean
          reiniciando?: boolean
          tampa_quebrada?: boolean
          tecnico_id?: string | null
          tela_quebrada?: boolean
          touch_funcionando?: boolean
          updated_at?: string
        }
        Update: {
          alto_falante_defeito?: boolean
          aparelho_molhado?: boolean
          arranhoes?: boolean
          biometria_funcionando?: boolean
          botoes_danificados?: boolean
          camera_danificada?: boolean
          carcaca_amassada?: boolean
          conector_defeito?: boolean
          created_at?: string
          faceid_funcionando?: boolean
          id?: string
          inspecionado_em?: string
          lcd_funcionando?: boolean
          liga_normalmente?: boolean
          marcas_queda?: boolean
          microfone_defeito?: boolean
          nao_liga?: boolean
          observacoes?: string | null
          ordem_servico_id?: string
          outro?: string | null
          oxidacao?: boolean
          reiniciando?: boolean
          tampa_quebrada?: boolean
          tecnico_id?: string | null
          tela_quebrada?: boolean
          touch_funcionando?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_aparelho_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: true
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
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
      fotos_ordem_servico: {
        Row: {
          created_at: string
          descricao: string | null
          enviado_por: string | null
          etapa: string
          id: string
          ordem_servico_id: string
          url_foto: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          enviado_por?: string | null
          etapa?: string
          id?: string
          ordem_servico_id: string
          url_foto: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          enviado_por?: string | null
          etapa?: string
          id?: string
          ordem_servico_id?: string
          url_foto?: string
        }
        Relationships: [
          {
            foreignKeyName: "fotos_ordem_servico_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
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
          cancelada_em: string | null
          cancelada_por: string | null
          cliente_id: string
          created_at: string
          data_entrada: string
          data_entrega: string | null
          defeito: string
          deleted: boolean
          deleted_at: string | null
          deleted_by: string | null
          desconto: number
          diagnostico: string | null
          fotos: string[]
          id: string
          motivo_cancelamento: string | null
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
          cancelada_em?: string | null
          cancelada_por?: string | null
          cliente_id: string
          created_at?: string
          data_entrada?: string
          data_entrega?: string | null
          defeito?: string
          deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
          desconto?: number
          diagnostico?: string | null
          fotos?: string[]
          id?: string
          motivo_cancelamento?: string | null
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
          cancelada_em?: string | null
          cancelada_por?: string | null
          cliente_id?: string
          created_at?: string
          data_entrada?: string
          data_entrega?: string | null
          defeito?: string
          deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
          desconto?: number
          diagnostico?: string | null
          fotos?: string[]
          id?: string
          motivo_cancelamento?: string | null
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
      whatsapp_config: {
        Row: {
          api_key: string
          api_url: string
          auto_enviar: boolean
          connection_status: string
          created_at: string
          id: string
          instance_name: string
          last_sync: string | null
          phone_number: string | null
          profile_name: string | null
          profile_picture: string | null
          updated_at: string
        }
        Insert: {
          api_key?: string
          api_url?: string
          auto_enviar?: boolean
          connection_status?: string
          created_at?: string
          id?: string
          instance_name?: string
          last_sync?: string | null
          phone_number?: string | null
          profile_name?: string | null
          profile_picture?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string
          api_url?: string
          auto_enviar?: boolean
          connection_status?: string
          created_at?: string
          id?: string
          instance_name?: string
          last_sync?: string | null
          phone_number?: string | null
          profile_name?: string | null
          profile_picture?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_mensagens: {
        Row: {
          agendada_para: string | null
          cliente_id: string | null
          conteudo: string
          created_at: string
          direcao: string
          erro: string | null
          evolution_id: string | null
          id: string
          lida: boolean
          media_nome: string | null
          media_url: string | null
          ordem_servico_id: string | null
          status: string
          telefone: string
          tipo: string
          updated_at: string
          usuario_id: string | null
          usuario_nome: string | null
        }
        Insert: {
          agendada_para?: string | null
          cliente_id?: string | null
          conteudo?: string
          created_at?: string
          direcao?: string
          erro?: string | null
          evolution_id?: string | null
          id?: string
          lida?: boolean
          media_nome?: string | null
          media_url?: string | null
          ordem_servico_id?: string | null
          status?: string
          telefone: string
          tipo?: string
          updated_at?: string
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Update: {
          agendada_para?: string | null
          cliente_id?: string | null
          conteudo?: string
          created_at?: string
          direcao?: string
          erro?: string | null
          evolution_id?: string | null
          id?: string
          lida?: boolean
          media_nome?: string | null
          media_url?: string | null
          ordem_servico_id?: string | null
          status?: string
          telefone?: string
          tipo?: string
          updated_at?: string
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_mensagens_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_mensagens_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_modelos: {
        Row: {
          ativo: boolean
          chave: string
          conteudo: string
          created_at: string
          evento: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          chave: string
          conteudo: string
          created_at?: string
          evento?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          chave?: string
          conteudo?: string
          created_at?: string
          evento?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
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
        | "Cancelada"
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
        "Cancelada",
      ],
    },
  },
} as const
