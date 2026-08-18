import os
from PIL import Image

SRC = r"C:\Users\andre.eiras\Desktop\Apresentações Ek\build\master_unzip\ppt\media"
OUT = r"C:\Users\andre.eiras\Desktop\Apresentações Ek\build\assets"
os.makedirs(OUT, exist_ok=True)

COLORS = {
    "white": (255, 255, 255),
    "teal": (12, 109, 97),
    "orange": (242, 104, 0),
    "darkgreen": (1, 45, 43),
    "mint": (163, 204, 171),
}

def recolor(src_name, out_prefix):
    im = Image.open(os.path.join(SRC, src_name)).convert("RGBA")
    alpha = im.split()[3]
    for cname, rgb in COLORS.items():
        solid = Image.new("RGBA", im.size, rgb + (0,))
        solid.putalpha(alpha)
        solid.save(os.path.join(OUT, f"{out_prefix}_{cname}.png"))

# Logo lockups (copy as-is, already correct colors)
Image.open(os.path.join(SRC, "image-34-2.png")).save(os.path.join(OUT, "logo_full_light.png"))   # dark wordmark + subtitle, for white bg
Image.open(os.path.join(SRC, "image-34-3.png")).save(os.path.join(OUT, "logo_full_dark.png"))     # white wordmark + subtitle, for dark bg
Image.open(os.path.join(SRC, "image-34-1.png")).save(os.path.join(OUT, "logo_simple_light.png"))  # dark wordmark only, for white bg
Image.open(os.path.join(SRC, "image-34-5.png")).save(os.path.join(OUT, "logo_simple_dark.png"))   # white wordmark only, for dark bg

# Brand icon bank (recolor each to white/teal/orange/darkgreen/mint)
ICON_MAP = {
    "bi_desmonte": "image-33-2.png",       # Desmontagem de veiculos
    "bi_vendapecas": "image-33-4.png",     # Venda de pecas
    "bi_estoque": "image-33-6.png",        # Estoque de pecas
    "bi_motores": "image-33-8.png",        # Motores remanufaturados
    "bi_cambios": "image-33-10.png",       # Cambios e transmissoes
    "bi_oficina": "image-33-12.png",       # Oficina e servicos
    "bi_inspecao": "image-33-14.png",      # Inspecao e qualidade
    "bi_armazenamento": "image-33-16.png", # Armazenamento
    "bi_logistica": "image-33-18.png",     # Logistica e entrega
    "bi_rastreio": "image-33-20.png",      # Rastreabilidade
    "bi_importacao": "image-33-22.png",    # Importacao
    "bi_compraveiculos": "image-33-24.png",# Compra de veiculos
    "bi_vendaveiculos": "image-33-26.png", # Venda de veiculos
    "bi_frotacliente": "image-33-28.png",  # Frota do cliente
    "bi_catalogo": "image-33-30.png",      # Catalogo digital
    "bi_garantia": "image-33-32.png",      # Garantia
    "bi_economiacircular": "image-33-34.png", # Economia circular
    "bi_selos": "image-33-36.png",         # Selos e ativos ambientais
    "bi_reciclagem": "image-33-38.png",    # Reciclagem de metal
    "bi_economiacusto": "image-33-40.png", # Economia de custo
}

for prefix, fname in ICON_MAP.items():
    recolor(fname, prefix)

print("done", len(ICON_MAP), "icons +", 4, "logo variants")
