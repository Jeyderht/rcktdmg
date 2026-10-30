import { PackageOpen } from "lucide-react";

import CatalogoCategorias, {
  type CategoriaInicio,
} from "@/components/home/CatalogoCategorias";
import ColeccionCard from "@/components/tienda/ColeccionCard";
import ProductCard from "@/components/tienda/ProductCard";
import EmptyState from "@/components/ui/EmptyState";
import { aTarjeta } from "@/lib/catalogo";
import type { ColeccionVista } from "@/lib/colecciones-comerciales-comun";
import {
  CATEGORIA_EVENTOS,
  CATEGORIA_SOCIAL_MEDIA,
  type datosCatalogoInicio,
} from "@/lib/home";

type Datos = Awaited<ReturnType<typeof datosCatalogoInicio>>;
type Recurso = Datos["eventos"]["recientes"][number];

function Vacio() {
  return (
    <EmptyState
      icon={PackageOpen}
      title="Aún no hay recursos aquí"
      description="Cuando se publiquen, aparecerán en esta sección."
    />
  );
}

/* Hasta 6 recursos en rejilla de 3 columnas: solo la imagen con su
   precio; toda la tarjeta lleva a la ficha. */
const TOPE_REJILLA = 6;

function Recursos({ recursos }: { recursos: Recurso[] }) {
  if (recursos.length === 0) return <Vacio />;

  return (
    <ul className="rk-cc-rejilla">
      {recursos.slice(0, TOPE_REJILLA).map((r) => (
        <li key={r.id}>
          <ProductCard product={aTarjeta(r)} soloImagen />
        </li>
      ))}
    </ul>
  );
}

function Colecciones({ colecciones }: { colecciones: ColeccionVista[] }) {
  if (colecciones.length === 0) return <Vacio />;

  return (
    <ul className="rk-cc-tarjetas">
      {colecciones.map((c) => (
        <li key={c.id} className="rk-cc-tarjeta">
          <ColeccionCard coleccion={c} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Pestañas de una categoría de recursos: Recientes siempre (con
 * su estado vacío); Populares y Packs solo si tienen recursos.
 */
function pestanasDe(grupo: {
  recientes: Recurso[];
  populares: Recurso[];
  packs?: Recurso[];
}): CategoriaInicio["pestanas"] {
  return [
    {
      clave: "recientes" as const,
      nombre: "Recientes",
      contenido: <Recursos recursos={grupo.recientes} />,
    },
    grupo.populares.length > 0 && {
      clave: "populares" as const,
      nombre: "Populares",
      contenido: <Recursos recursos={grupo.populares} />,
    },
    grupo.packs &&
      grupo.packs.length > 0 && {
        clave: "packs" as const,
        nombre: "Packs",
        contenido: <Recursos recursos={grupo.packs} />,
      },
  ].filter((p) => p !== false && p !== undefined);
}

/**
 * Catálogo por categoría del inicio: arma las cuatro categorías
 * con sus pestañas ya renderizadas y se las pasa al componente
 * de cliente, que solo decide cuál se ve. Textos de descripción,
 * los mismos que ya usaba la portada.
 */
export default function CatalogoInicio({ datos }: { datos: Datos }) {
  // Sin ningún recurso ni colección publicados, la sección no se pinta.
  const hayDatos =
    [datos.eventos, datos.general, datos.packs].some(
      (g) => g.recientes.length > 0 || g.populares.length > 0
    ) || datos.colecciones.length > 0;

  if (!hayDatos) return null;

  const categorias: CategoriaInicio[] = [
    {
      clave: "eventos",
      nombre: "Eventos",
      descripcion:
        "Flyers de fiestas, conciertos y fechas señaladas. Listos para publicar.",
      href: `/tienda?categoria=${CATEGORIA_EVENTOS}`,
      pestanas: pestanasDe(datos.eventos),
    },
    {
      clave: "general",
      nombre: "General",
      descripcion: "Piezas para comunicar con una marca detrás.",
      // La tienda no tiene «todo menos Eventos»: su chip «General»
      // lleva a Social Media, y este «Ver todo» también.
      href: `/tienda?categoria=${CATEGORIA_SOCIAL_MEDIA}`,
      pestanas: pestanasDe(datos.general),
    },
    {
      clave: "colecciones",
      nombre: "Colecciones",
      descripcion:
        "Varios recursos de una misma temática, con su licencia cada uno, por un precio único.",
      href: "/colecciones-comerciales",
      pestanas: [
        {
          clave: "recientes",
          nombre: "Recientes",
          contenido: <Colecciones colecciones={datos.colecciones} />,
        },
      ],
    },
    {
      clave: "packs",
      nombre: "Packs",
      descripcion: "Varios recursos agrupados, más baratos que por separado.",
      href: "/tienda?pack=true",
      pestanas: pestanasDe(datos.packs),
    },
  ];

  return <CatalogoCategorias categorias={categorias} />;
}
