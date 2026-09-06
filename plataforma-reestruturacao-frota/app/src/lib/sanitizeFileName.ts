// Chaves de objeto no Supabase Storage rejeitam espaços, acentos e outros
// caracteres especiais ("Invalid key"). Usado ao montar o caminho de upload
// a partir do nome original do arquivo escolhido pelo usuário.
export function sanitizeFileName(name: string): string {
  const withoutAccents = name.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return withoutAccents.replace(/[^a-zA-Z0-9._-]/g, "_");
}
