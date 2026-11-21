import { chaveDoLimite, consumirLimitePublico, ipDaRequisicao } from "@/lib/dados/limites";
import { obterPainelProfessor } from "@/lib/dados/painel-professor";
import { envServidor } from "@/lib/env";
import { naoEncontrado, tratarErro } from "@/lib/http/erros";
import { clienteAdmin } from "@/lib/supabase/admin";
import { codigoProfessorSchema, consultaProfessorSchema } from "@/lib/validacao/painel";

export async function GET(request: Request) {
  let resposta: Response;
  try {
    const admin = clienteAdmin();
    await consumirLimitePublico(admin, {
      chave: chaveDoLimite("professor", ipDaRequisicao(request), envServidor().SUPABASE_SERVICE_ROLE_KEY),
      limite: 30, janela: "1 minute", mensagem: "Muitas tentativas. Espere um pouco e tente de novo.",
    });
    consultaProfessorSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const codigo = codigoProfessorSchema.safeParse(request.headers.get("X-Codigo-Professor"));
    if (!codigo.success) throw naoEncontrado("ESCOLA_NAO_ENCONTRADA", "Escola não encontrada.");
    resposta = Response.json(await obterPainelProfessor(admin, codigo.data));
  } catch (e) {
    resposta = tratarErro(e);
  }
  resposta.headers.set("Cache-Control", "private, no-store");
  return resposta;
}
