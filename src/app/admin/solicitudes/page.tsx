import { permanentRedirect } from "next/navigation";

/** La cola de candidaturas vive ahora en /admin/creadores. */
export default function AdminSolicitudesPage() {
  permanentRedirect("/admin/creadores");
}
