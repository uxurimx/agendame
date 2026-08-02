import LegalPage from "@/components/legal/LegalPage";

export const metadata = {
  title: "Términos y Condiciones — Agéndame",
  description: "Términos y Condiciones vigentes de Agéndame.",
};

const sections = [
  {
    title: "1. Objeto",
    paragraphs: [
      "Agéndame es una plataforma web para administración de citas, agenda, clientas, profesionales, reportes y reservas públicas para negocios de servicios por cita.",
    ],
  },
  {
    title: "2. Prestador del servicio",
    paragraphs: [
      "El servicio Agéndame es operado por POXELBIT SAS, con domicilio en Hermanos Flores Magón #3102, Infonavit Humaya, Culiacán, Sinaloa, México, C.P. 80020.",
    ],
    bullets: ["contacto@agendame.mx", "soporte@agendame.mx", "soporte@poxelbit.mx"],
  },
  {
    title: "3. Alta y uso de cuenta",
    bullets: [
      "Para usar ciertas funciones de Agéndame, la persona usuaria debe crear una cuenta y aceptar estos términos.",
      "La persona usuaria debe proporcionar información veraz y actualizada.",
      "La persona usuaria es responsable de resguardar sus credenciales y accesos.",
      "La persona usuaria debe utilizar la plataforma conforme a la ley y a estos términos.",
    ],
  },
  {
    title: "4. Funcionalidades y planes",
    paragraphs: [
      "Agéndame puede incluir herramientas para gestión de negocios, servicios, profesionales, agenda de citas, página pública de reservas, clientas o clientes, historial visual, reportes, soporte y notificaciones operativas.",
      "Agéndame también puede mostrar planes, módulos o funciones en desarrollo, próximo lanzamiento, prueba o construcción. Esto incluye funcionalidades asociadas a Pro y Multisucursal, tales como fidelidad, pagos y operación para múltiples sucursales.",
      "Su visualización dentro del producto, landing, panel o materiales comerciales no obliga a su disponibilidad inmediata ni constituye garantía de fecha específica de liberación, salvo comunicación expresa en contrario.",
    ],
  },
  {
    title: "5. Planes y pagos",
    paragraphs: [
      "Agéndame puede ofrecer distintos planes, periodos de prueba, precios, funciones, complementos o cobros adicionales. Algunos planes o funcionalidades pueden no estar disponibles al momento de crear la cuenta y habilitarse posteriormente.",
      "Cuando existan pagos o suscripciones, éstos se procesarán por los medios habilitados por Agéndame en ese momento y conforme a las condiciones mostradas al usuario dentro de la plataforma.",
    ],
  },
  {
    title: "6. Suspensión, cancelación y baja",
    paragraphs: [
      "Agéndame puede ofrecer periodos de prueba, suspender acceso por falta de pago o limitar funciones conforme al estado de la suscripción.",
      "La persona usuaria puede cancelar el servicio conforme a las opciones disponibles en la plataforma. En ciertos supuestos, la cuenta puede quedar desactivada y su información programada para eliminación posterior con una ventana operativa aproximada de hasta 30 días.",
    ],
  },
  {
    title: "7. Datos y contenido del usuario",
    paragraphs: [
      "La persona usuaria conserva la responsabilidad sobre los datos, notas, imágenes, referencias y demás contenido que capture o cargue en Agéndame.",
      "La persona usuaria declara que cuenta con autorización suficiente para tratar y cargar datos de sus clientes, incluyendo imágenes que puedan identificar personas.",
      "Agéndame podrá acceder al contenido cuando sea necesario para soporte, mantenimiento, seguridad, prevención de fraude, investigación de incidentes o cumplimiento legal.",
    ],
  },
  {
    title: "8. Operación, propiedad y jurisdicción",
    paragraphs: [
      "Agéndame puede utilizar información operativa y técnica necesaria para seguridad, soporte, continuidad, diagnóstico y mejora del servicio.",
      "La plataforma, su marca, diseño, software, estructura, textos y elementos distintivos son propiedad de sus titulares o licenciantes.",
      "Estos términos se interpretarán conforme a las leyes aplicables en México. Cualquier controversia se atenderá ante las autoridades competentes que correspondan conforme a la legislación aplicable, salvo disposición distinta obligatoria por ley.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Términos y Condiciones"
      updatedAt="2 de agosto de 2026"
      intro="Estos términos regulan el uso general de Agéndame y la relación entre la plataforma y la persona usuaria."
      sections={sections}
    />
  );
}
