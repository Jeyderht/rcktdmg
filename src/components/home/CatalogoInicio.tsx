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
  CATEGORIA_GENERAL,
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

/* Móvil: carrusel con scroll-snap. Desde 760 px: rejilla de 4. */
function Recursos({ recursos }: { recursos: Recurso[] }) {
  if (recursos.length === 0) return <Vacio />;

  return (
    <ul className="rk-cc-tarjetas">
      {recursos.map((r) => (
        <li key={r.id} className="rk-cc-tarjeta">
          <ProductCard product={aTarjeta(r)} conAgregar />
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
      href: `/tienda?categoria=${CATEGORIA_GENERAL}`,
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
