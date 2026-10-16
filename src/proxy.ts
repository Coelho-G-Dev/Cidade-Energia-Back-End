import { NextResponse, type NextRequest } from "next/server";
import { CABECALHOS_CORS, origemPermitida, origensConfiguradas } from "@/lib/http/cors";

export function proxy(request: NextRequest) {
  const origem = request.headers.get("origin");
  const cabecalhos = new Headers(CABECALHOS_CORS);
  if (origem && origemPermitida(origem, origensConfiguradas())) {
    cabecalhos.set("Access-Control-Allow-Origin", origem);
  }

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: cabecalhos });
  }

  const resposta = NextResponse.next();
  cabecalhos.forEach((valor, nome) => resposta.headers.set(nome, valor));
  return resposta;
}

export const config = {
  matcher: "/api/:path*",
};
