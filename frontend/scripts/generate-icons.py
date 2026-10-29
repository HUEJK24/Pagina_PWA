"""Genera los íconos PNG de la PWA.

Uso:
    python3 scripts/generate-icons.py

Requiere Pillow. Escribe en public/icons/:
    icon-192.png, icon-512.png, icon-512-maskable.png, apple-touch-icon.png
"""

from pathlib import Path

from PIL import Image, ImageDraw

BASE = Path(__file__).resolve().parent.parent / "public" / "icons"
BASE.mkdir(parents=True, exist_ok=True)

GREEN = (12, 92, 73, 255)
GREEN_DARK = (8, 69, 55, 255)
WHITE = (255, 253, 248, 255)
LINE = (168, 205, 192, 255)


def dibujar(size: int, maskable: bool) -> Image.Image:
    escala = 4  # se dibuja grande y se reduce para suavizar bordes
    lado = size * escala
    imagen = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    dibujo = ImageDraw.Draw(imagen)

    # Fondo: cuadrado completo para "any", con margen seguro para "maskable".
    if maskable:
        margen = int(lado * 0.10)
        radio = int(lado * 0.18)
        dibujo.rounded_rectangle(
            (margen, margen, lado - margen, lado - margen),
            radius=radio,
            fill=GREEN,
        )
    else:
        dibujo.rounded_rectangle((0, 0, lado, lado), radius=int(lado * 0.22), fill=GREEN)

    # Área de dibujo: 56 % del lienzo, centrada.
    ancho = int(lado * 0.50)
    alto = int(lado * 0.60)
    x0 = (lado - ancho) // 2
    y0 = (lado - alto) // 2 + int(lado * 0.015)
    x1, y1 = x0 + ancho, y0 + alto

    # Hoja del reporte.
    dibujo.rounded_rectangle(
        (x0, y0, x1, y1),
        radius=int(lado * 0.05),
        fill=WHITE,
    )

    # Pinza superior.
    pinza_ancho = int(ancho * 0.46)
    pinza_alto = int(lado * 0.075)
    px0 = (lado - pinza_ancho) // 2
    dibujo.rounded_rectangle(
        (px0, y0 - pinza_alto // 2, px0 + pinza_ancho, y0 + pinza_alto // 2),
        radius=int(pinza_alto // 2),
        fill=GREEN_DARK,
    )

    # Tres renglones.
    margen_linea = int(ancho * 0.18)
    alto_linea = int(lado * 0.035)
    for indice, factor in enumerate((1.0, 0.82, 0.55)):
        ly = y0 + int(alto * 0.32) + indice * int(alto * 0.19)
        dibujo.rounded_rectangle(
            (
                x0 + margen_linea,
                ly,
                x0 + margen_linea + int((ancho - 2 * margen_linea) * factor),
                ly + alto_linea,
            ),
            radius=alto_linea // 2,
            fill=LINE,
        )

    # Marca de verificación.
    cx = x1 - int(ancho * 0.20)
    cy = y1 - int(alto * 0.16)
    r = int(lado * 0.085)
    dibujo.ellipse((cx - r, cy - r, cx + r, cy + r), fill=GREEN_DARK)
    grosor = max(2, int(r * 0.30))
    dibujo.line(
        [(cx - r * 0.45, cy), (cx - r * 0.10, cy + r * 0.35), (cx + r * 0.50, cy - r * 0.38)],
        fill=WHITE,
        width=grosor,
        joint="curve",
    )

    return imagen.resize((size, size), Image.LANCZOS)


def main() -> None:
    dibujar(192, maskable=False).save(BASE / "icon-192.png", optimize=True)
    dibujar(512, maskable=False).save(BASE / "icon-512.png", optimize=True)
    dibujar(512, maskable=True).save(BASE / "icon-512-maskable.png", optimize=True)
    dibujar(180, maskable=False).save(BASE / "apple-touch-icon.png", optimize=True)
    print(f"Íconos generados en {BASE}")


if __name__ == "__main__":
    main()
