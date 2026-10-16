import type { SupabaseClient } from "@supabase/supabase-js";

export type Operacao = {
  tabela: string;
  chamadas: { metodo: string; args: unknown[] }[];
};

type Resultado = { data?: unknown; error?: unknown; count?: number | null };
export type Responder = (op: Operacao) => Resultado;

export function supabaseFalso(responder: Responder) {
  const operacoes: Operacao[] = [];

  const construtor = (op: Operacao) => {
    const proxy: Record<string, unknown> = new Proxy(
      {},
      {
        get(_alvo, prop: string) {
          if (prop === "then") {
            const r = responder(op);
            const final = { data: r.data ?? null, error: r.error ?? null, count: r.count ?? null };
            return (resolver: (v: unknown) => unknown) => Promise.resolve(final).then(resolver);
          }
          return (...args: unknown[]) => {
            op.chamadas.push({ metodo: prop, args });
            return proxy;
          };
        },
      },
    );
    return proxy;
  };

  const cliente = {
    from(tabela: string) {
      const op: Operacao = { tabela, chamadas: [] };
      operacoes.push(op);
      return construtor(op);
    },
    rpc(nome: string, args: unknown) {
      const op: Operacao = { tabela: `rpc:${nome}`, chamadas: [{ metodo: "rpc", args: [args] }] };
      operacoes.push(op);
      return construtor(op);
    },
  };

  return { cliente: cliente as unknown as SupabaseClient, operacoes };
}

export const usou = (op: Operacao, metodo: string) => op.chamadas.find((c) => c.metodo === metodo);
