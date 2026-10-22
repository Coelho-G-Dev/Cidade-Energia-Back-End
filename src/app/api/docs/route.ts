import { CACHE, cabecalhoDeCache } from "@/lib/http/cache";

const VERSAO_SWAGGER_UI = "5.17.14";
const CDN = `https://unpkg.com/swagger-ui-dist@${VERSAO_SWAGGER_UI}`;

const pagina = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cidade Energia API</title>
    <link rel="stylesheet" href="${CDN}/swagger-ui.css" />
    <style>body { margin: 0; background: #fff; }</style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="${CDN}/swagger-ui-bundle.js" crossorigin></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: "/api/openapi",
        dom_id: "#swagger-ui",
        deepLinking: true,
        persistAuthorization: true,
        displayRequestDuration: true,
        tryItOutEnabled: true,
      });
    </script>
  </body>
</html>`;

export function GET() {
  return new Response(pagina, {
    headers: { "content-type": "text/html; charset=utf-8", ...cabecalhoDeCache(CACHE.documentacao) },
  });
}
