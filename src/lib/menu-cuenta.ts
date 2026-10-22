/**
 * Menú único de la cuenta — fuente de verdad de qué ve cada rol.
 *
 *  - CLIENT  → Mi cuenta
 *  - CREATOR → Mi cuenta + Creator Studio
 *  - ADMIN   → Mi cuenta + Creator Studio + Administración
 *
 * Quien tiene más permisos conserva todo lo de abajo: un creador
 * también compra, y un administrador puede entrar a los tres
 * espacios. El middleware sigue siendo quien protege las rutas;
 * esto solo decide qué se muestra.
 */

export type RolCuenta = "ADMIN" | "CREATOR" | "CLIENT";

export type ItemMenu = {
  href: string;
  label: string;
  /** Nombre del icono en lucide-react. */
  icono: string;
  exacto?: boolean;
  consulta?: { ruta: string; query: string };
  /**
   * Sección visual dentro del área (solo Administración): los
   * elementos seguidos con la misma sección se rotulan juntos.
   * No cambia rutas ni quién ve qué.
   */
  seccion?: string;
};

export type GrupoMenu = {
  id: "cuenta" | "studio" | "admin";
  titulo: string;
  roles: RolCuenta[];
  items: ItemMenu[];
};

export const GRUPOS_MENU: GrupoMenu[] = [
  {
    id: "cuenta",
    titulo: "Mi cuenta",
    roles: ["CLIENT", "CREATOR", "ADMIN"],
    items: [
      { href: "/mi-cuenta", label: "Resumen", icono: "LayoutDashboard", exacto: true },
      { href: "/mi-cuenta/compras", label: "Compras", icono: "Receipt" },
      { href: "/mi-cuenta/descargas", label: "Descargas", icono: "Download" },
      { href: "/mi-cuenta/licencias", label: "Licencias", icono: "BadgeCheck" },
      { href: "/mi-cuenta/colecciones", label: "Colecciones", icono: "Library" },
      { href: "/mi-cuenta/favoritos", label: "Favoritos", icono: "Heart" },
      { href: "/mi-cuenta/siguiendo", label: "Siguiendo", icono: "Users" },
    ],
  },
  {
    id: "studio",
    titulo: "Creator Studio",
    roles: ["CREATOR", "ADMIN"],
    items: [
      { href: "/creadores/panel", label: "Inicio", icono: "LayoutDashboard", exacto: true },
      { href: "/creadores/panel/recursos", label: "Mis recursos", icono: "Package" },
      { href: "/creadores/panel/nuevo", label: "Crear recurso", icono: "Plus" },
      { href: "/creadores/panel/packs", label: "Packs", icono: "Layers" },
      { href: "/creadores/panel/colecciones", label: "Colecciones", icono: "Library" },
      { href: "/creadores/panel/retiros", label: "Ganancias", icono: "Wallet" },
      { href: "/creadores/panel/metodos-pago", label: "Métodos de pago", icono: "CreditCard" },
      { href: "/creadores/panel/seguidores", label: "Seguidores", icono: "Users" },
      { href: "/creadores/panel/perfil", label: "Perfil", icono: "UserRound" },
    ],
  },
  {
    id: "admin",
    titulo: "Administración",
    roles: ["ADMIN"],
    /*
      Las mismas 14 entradas de siempre, ordenadas por secciones:
      lo que espera una acción arriba, luego el catálogo, la
      comunidad y la configuración. «Dashboard» sigue primero (es
      el inicio del área en «Cambiar de área»).
    */
    items: [
      { href: "/admin", label: "Dashboard", icono: "LayoutDashboard", exacto: true, seccion: "Principal" },
      {
        href: "/admin/recursos?estado=PENDING_REVIEW",
        label: "Revisiones",
        icono: "ClipboardCheck",
        consulta: { ruta: "/admin/recursos", query: "estado=PENDING_REVIEW" },
        seccion: "Pendientes",
      },
      { href: "/admin/creadores", label: "Solicitudes", icono: "Inbox", seccion: "Pendientes" },
      { href: "/admin/retiros", label: "Retiros", icono: "Wallet", seccion: "Pendientes" },
      { href: "/admin/recursos", label: "Recursos", icono: "Package", seccion: "Catálogo" },
      { href: "/admin/packs", label: "Packs", icono: "Layers", seccion: "Catálogo" },
      { href: "/admin/colecciones", label: "Colecciones", icono: "Library", seccion: "Catálogo" },
      { href: "/admin/categorias", label: "Categorías", icono: "FolderTree", seccion: "Catálogo" },
      { href: "/admin/tags", label: "Etiquetas", icono: "Tag", seccion: "Catálogo" },
      { href: "/admin/usuarios", label: "Usuarios", icono: "Users", seccion: "Comunidad" },
      {
        href: "/admin/usuarios?rol=CREATOR",
        label: "Creadores",
        icono: "UserRound",
        consulta: { ruta: "/admin/usuarios", query: "rol=CREATOR" },
        seccion: "Comunidad",
      },
      { href: "/admin/resenas", label: "Valoraciones", icono: "Star", seccion: "Comunidad" },
      { href: "/admin/usuarios/nuevo", label: "Crear creador", icono: "UserPlus", seccion: "Comunidad" },
      { href: "/admin/requisitos", label: "Requisitos", icono: "BookOpen", seccion: "Configuración" },
    ],
  },
];

/** Grupos visibles para un rol. Un rol desconocido ve solo «Mi cuenta». */
export function gruposParaRol(rol: string | null | undefined): GrupoMenu[] {
  const r = (rol === "ADMIN" || rol === "CREATOR" ? rol : "CLIENT") as RolCuenta;

  return GRUPOS_MENU.filter((g) => g.roles.includes(r));
}

/** Grupo al que pertenece una ruta, para el título de la cabecera móvil. */
export function grupoDeRuta(pathname: string): GrupoMenu["id"] {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/creadores/panel")) return "studio";

  return "cuenta";
}
