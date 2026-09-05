/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse/pdfjs-dist e @napi-rs/canvas dependem de um módulo nativo
  // (.node). Empacotados pelo webpack, a resolução desse binário quebra em
  // produção ("DOMMatrix is not defined") mesmo com a dependência instalada.
  // Marcando como externos, o Next faz um require() normal em runtime a
  // partir do node_modules da função serverless, onde o binário existe.
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
    // pdfjs-dist faz um require() dinâmico de @napi-rs/canvas dentro de um
    // try/catch — invisível para o rastreador de arquivos do Next, então o
    // binário nativo fica de fora do pacote da função serverless a menos
    // que seja incluído explicitamente aqui.
    // pdfjs-dist também carrega seu worker (pdf.worker.mjs) e outros arquivos
    // via caminho resolvido em runtime — mesmo problema de invisibilidade
    // para o rastreador. Incluindo o pacote inteiro para não ficar caçando
    // arquivo por arquivo a cada novo erro.
    outputFileTracingIncludes: {
      "/api/mechanical-inspection/parse": [
        "./node_modules/@napi-rs/canvas*/**",
        "./node_modules/pdfjs-dist/**",
      ],
      "/api/inspection/parse": [
        "./node_modules/@napi-rs/canvas*/**",
        "./node_modules/pdfjs-dist/**",
      ],
    },
  },
};

module.exports = nextConfig;
