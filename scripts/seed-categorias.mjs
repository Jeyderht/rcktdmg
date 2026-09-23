/**
 * Categorías comerciales, reasignación y backfill de formato.
 *
 *   node scripts/seed-categorias.mjs             -> DRY RUN
 *   node scripts/seed-categorias.mjs --ejecutar  -> aplica
 *
 * Qué hace:
 *
 *  1. Crea las cuatro categorías comerciales si no existen.
 *     Nunca borra ni renombra las que ya están.
 *
 *  2. Reasigna cada producto según lo que dicen su nombre y su
 *     descripción. Lo que no se puede determinar con confianza
 *     va a General, nunca se adivina.
 *
 *  3. Rellena fileFormat con la extensión real del archivo.
 *     Sin archivo, queda NULL.
 *
 *  4. Crea la etiqueta "pack" y la aplica solo a los productos
 *     que se llaman o se describen como pack.
 *
 * No toca color: lo declara el creador desde el formulario.
 */

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const EJECUTAR = process.argv.includes("--ejecutar");
const RAIZ = process.cwd();

const vistas = new Set();
for (const archivo of [".env", ".env.local"]) {
  const ruta = path.join(RAIZ, archivo);
  if (!fs.existsSync(ruta)) continue;
  for (const linea of fs.readFileSync(ruta, "utf8").split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const clave = m[1];
    let valor = m[2].trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    if (process.env[clave] !== undefined && !vistas.has(clave)) continue;
    process.env[clave] = valor;
    vistas.add(clave);
  }
}

const prisma = new PrismaClient();

const CATEGORIAS = [
  {
    slug: "social-media",
    name: "Social Media",
    description: "Recursos para redes sociales.",
  },
  {
    slug: "eventos",
    name: "Eventos",
    description: "Piezas para eventos, fiestas y conciertos.",
  },
  {
    slug: "corporativos",
    name: "Corporativos",
    description: "Material para empresas y marcas.",
  },
  {
    slug: "general",
    name: "General",
    description: "Recursos de uso general.",
  },
];

/**
 * Clasificación por texto real del producto.
 *
 * Solo se usan nombre y descripción, que son datos del propio
 * recurso. Si ninguna regla encaja, va a General: es preferible
 * una categoría neutra a una inventada.
 */
function clasificar(nombre, descripcion) {
  const texto = `${nombre} ${descripcion || ""}`.toLowerCase();

  const reglas = [
    {
      slug: "social-media",
      patron:
        /social media|redes sociales|instagram|tiktok|facebook|reel|story|stories|post\b/,
    },
    {
      slug: "eventos",
      patron:
        /evento|fiesta|concierto|festival|party|flyer|afiche|cartel/,
    },
    {
      slug: "corporativos",
      patron:
        /corporativ|empresa|negocio|marca|branding|comercial|profesional/,
    },
  ];

  for (const regla of reglas) {
    if (regla.patron.test(texto)) return regla.slug;
  }

  return "general";
}

/** Un pack solo se marca si el propio recurso lo dice. */
function pareceUnPack(nombre, descripcion) {
  return /\bpack\b/i.test(`${nombre} ${descripcion || ""}`);
}

function extensionDe(fileUrl) {
  if (!fileUrl) return null;

  let nombre = fileUrl.split("?")[0].split("/").pop() || "";

  try {
    nombre = decodeURIComponent(nombre);
  } catch {
    /* se usa tal cual */
  }

  const punto = nombre.lastIndexOf(".");
  if (punto < 0) return null;

  const ext = nombre.slice(punto + 1).toLowerCase();

  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : null;
}

async function main() {
  console.log(
    `\n=== CATEGORÍAS Y METADATOS — ${
      EJECUTAR ? "EJECUCIÓN REAL" : "DRY RUN (no se escribe nada)"
    } ===\n`
  );

  // ---------- 1. CATEGORÍAS ----------
  console.log("1. CATEGORÍAS COMERCIALES");

  const existentes = await prisma.category.findMany({
    select: { id: true, slug: true, name: true },
  });

  const porSlug = new Map(existentes.map((c) => [c.slug, c]));

  for (const categoria of CATEGORIAS) {
    if (porSlug.has(categoria.slug)) {
      console.log(`   ya existe: ${categoria.name}`);
      continue;
    }

    if (!EJECUTAR) {
      console.log(`   se crearía: ${categoria.name} (${categoria.slug})`);
      continue;
    }

    const creada = await prisma.category.create({
      data: categoria,
      select: { id: true, slug: true, name: true },
    });

    porSlug.set(creada.slug, creada);
    console.log(`   creada: ${creada.name}`);
  }

  const otras = existentes.filter(
    (c) => !CATEGORIAS.some((n) => n.slug === c.slug)
  );

  for (const c of otras) {
    console.log(
      `   se conserva sin tocar: "${c.name}" (quedará sin productos)`
    );
  }

  // ---------- 2. REASIGNACIÓN ----------
  console.log("\n2. REASIGNACIÓN DE PRODUCTOS");

  const productos = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      categoryId: true,
      fileUrl: true,
      fileFormat: true,
      category: { select: { slug: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  let movidos = 0;

  for (const producto of productos) {
    const destino = clasificar(producto.name, producto.description);
    const categoriaDestino = porSlug.get(destino);

    if (!categoriaDestino) {
      console.log(
        `   ${producto.name}: no se pudo resolver "${destino}" (dry run)`
      );
      continue;
    }

    if (producto.categoryId === categoriaDestino.id) {
      console.log(`   ${producto.name}: ya está en ${categoriaDestino.name}`);
      continue;
    }

    console.log(
      `   ${producto.name}: ${producto.category.name} -> ${categoriaDestino.name}`
    );

    if (EJECUTAR) {
      await prisma.product.update({
        where: { id: producto.id },
        data: { categoryId: categoriaDestino.id },
      });
    }

    movidos += 1;
  }

  // ---------- 3. FORMATO ----------
  console.log("\n3. FORMATO DEL ARCHIVO (backfill)");

  let conFormato = 0;
  let sinArchivo = 0;

  for (const producto of productos) {
    const ext = extensionDe(producto.fileUrl);

    if (!ext) {
      sinArchivo += 1;
      console.log(`   ${producto.name}: sin archivo -> NULL`);
      continue;
    }

    if (producto.fileFormat === ext) {
      console.log(`   ${producto.name}: ya tenía ${ext}`);
      continue;
    }

    console.log(`   ${producto.name}: ${ext}`);

    if (EJECUTAR) {
      await prisma.product.update({
        where: { id: producto.id },
        data: { fileFormat: ext },
      });
    }

    conFormato += 1;
  }

  // ---------- 4. PACKS ----------
  console.log("\n4. ETIQUETA DE PACK");

  let etiquetaPack = await prisma.tag.findUnique({
    where: { slug: "pack" },
    select: { id: true },
  });

  if (!etiquetaPack) {
    console.log("   se crea la etiqueta 'pack'");

    if (EJECUTAR) {
      etiquetaPack = await prisma.tag.create({
        data: { name: "Pack", slug: "pack" },
        select: { id: true },
      });
    }
  } else {
    console.log("   la etiqueta 'pack' ya existe");
  }

  let marcados = 0;

  for (const producto of productos) {
    if (!pareceUnPack(producto.name, producto.description)) continue;

    console.log(`   se marca como pack: ${producto.name}`);

    if (EJECUTAR && etiquetaPack) {
      await prisma.productTag.upsert({
        where: {
          productId_tagId: {
            productId: producto.id,
            tagId: etiquetaPack.id,
          },
        },
        create: { productId: producto.id, tagId: etiquetaPack.id },
        update: {},
      });
    }

    marcados += 1;
  }

  console.log("\n=== RESUMEN ===");
  console.log(`   productos revisados : ${productos.length}`);
  console.log(`   reasignados         : ${movidos}`);
  console.log(`   formato asignado    : ${conFormato}`);
  console.log(`   sin archivo (NULL)  : ${sinArchivo}`);
  console.log(`   marcados como pack  : ${marcados}`);
  console.log(`   color               : no se toca, lo declara el creador`);

  if (!EJECUTAR) {
    console.log(
      "\n   Dry run: no se escribió nada. Para aplicar: --ejecutar\n"
    );
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("ERROR:", error.message);
  await prisma.$disconnect();
  process.exit(1);
});
