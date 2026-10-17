import { NextResponse, type NextRequest } from "next/server";
import { CABECALHOS_CORS, origemPermitida, origensConfiguradas } from "@/lib/http/cors";
import { respostaErro } from "@/lib/http/erros";
import { metodosDaRota } from "@/lib/http/rotas";

function comCabecalhos(resposta: Response, cabecalhos: Headers): Response {
  cabecalhos.forEach((valor, nome) => resposta.headers.set(nome, valor));
  return resposta;
}

export function proxy(request: NextRequest) {
  const origem = request.headers.get("origin");
  const cabecalhos = new Headers(CABECALHOS_CORS);
  if (origem && origemPermitida(origem, origensConfiguradas())) {
    cabecalhos.set("Access-Control-Allow-Origin", origem);
  }

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: cabecalhos });
  }

  const metodos = metodosDaRota(request.nextUrl.pathname);
  if (!metodos) {
    return comCabecalhos(respostaErro(404, "ROTA_NAO_ENCONTRADA", "Esta rota da API não existe."), cabecalhos);
  }
  if (!metodos.includes(request.method)) {
    cabecalhos.set("Allow", metodos.join(", "));
    return comCabecalhos(
      respostaErro(405, "METODO_NAO_PERMITIDO", `Esta rota aceita só ${metodos.filter((m) => m !== "HEAD" && m !== "OPTIONS").join(", ")}.`),
      cabecalhos,
    );
  }

  return comCabecalhos(NextResponse.next(), cabecalhos);
}

export const config = {
  matcher: "/api/:path*",
};
