import { listarBairros } from "@/lib/dados/catalogos";
import { tratarErro } from "@/lib/http/erros";
import { clienteAnonimo } from "@/lib/supabase/servidor";

export async function GET() {
  try {
    return Response.json(await listarBairros(clienteAnonimo()));
  } catch (e) {
    return tratarErro(e);
  }
}
