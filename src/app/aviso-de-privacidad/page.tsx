import LegalPage from "@/components/legal/LegalPage";

export const metadata = {
  title: "Aviso de Privacidad — Agéndame",
  description: "Aviso de Privacidad vigente de Agéndame.",
};

const sections = [
  {
    title: "1. Responsable",
    paragraphs: [
      "POXELBIT SAS, en su carácter de prestador de servicios digitales y operador de Agéndame en México, es responsable del tratamiento de los datos personales recabados a través de la plataforma.",
    ],
    bullets: ["contacto@agendame.mx", "soporte@agendame.mx", "soporte@poxelbit.mx"],
  },
  {
    title: "2. Datos personales que podemos recabar y tratar",
    bullets: [
      "Datos de identificación y contacto del usuario o del negocio, como nombre, correo, teléfono, nombre comercial y datos básicos de operación.",
      "Datos de autenticación, acceso, seguridad y continuidad del servicio.",
      "Datos de clientas o clientes capturados por el propio usuario dentro de la plataforma.",
      "Notas, historial, referencias visuales, imágenes y demás contenido cargado por el usuario.",
      "Datos necesarios para soporte, cobro, administración de la cuenta, prevención de fraude, continuidad operativa y cumplimiento legal.",
    ],
  },
  {
    title: "3. Finalidades primarias del tratamiento",
    bullets: [
      "Crear, administrar, autenticar y proteger la cuenta del usuario.",
      "Operar la plataforma y sus funciones de agenda, reservas, clientes, profesionales, historial, reportes y herramientas relacionadas.",
      "Procesar solicitudes, soporte, cobros, suscripciones, cambios de plan, cancelaciones y atención operativa.",
      "Prevenir fraude, abuso, accesos no autorizados, incidentes de seguridad o usos contrarios a los términos aplicables.",
      "Mantener, mejorar, diagnosticar y dar continuidad al servicio.",
      "Cumplir obligaciones legales, regulatorias o requerimientos de autoridad competente.",
    ],
  },
  {
    title: "4. Datos de terceros capturados por el usuario",
    paragraphs: [
      "El negocio usuario es responsable de contar con base legal, aviso y autorizaciones necesarias para capturar datos de sus clientes dentro de Agéndame.",
      "Si el negocio usuario sube fotografías, referencias visuales o cualquier contenido que pueda identificar a una persona, declara que cuenta con autorización suficiente para dicho tratamiento y asume la responsabilidad correspondiente frente a terceros.",
    ],
  },
  {
    title: "5. Acceso, uso interno y compartición limitada",
    paragraphs: [
      "Agéndame no comercializa los datos personales recabados a través de la plataforma como parte ordinaria de su operación. No obstante, podrá acceder, utilizar o compartir cierta información cuando ello sea necesario para operar correctamente el servicio, prestar soporte técnico, mantenimiento, verificación, diagnóstico, continuidad operativa, seguridad, prevención de fraude, atención de incidentes o cumplimiento de obligaciones legales.",
      "La información también podrá ser tratada por terceros o proveedores que apoyen la operación tecnológica del servicio, en la medida estrictamente necesaria para su funcionamiento.",
    ],
  },
  {
    title: "6. Conservación, bloqueo y eliminación",
    paragraphs: [
      "Agéndame podrá conservar la información mientras exista relación activa con el usuario y por el tiempo razonablemente necesario para fines operativos, contractuales, legales, de seguridad, auditoría, respaldo, continuidad del servicio o atención de controversias.",
      "Cuando el usuario solicite la cancelación o eliminación de su cuenta, la información podrá quedar desactivada, bloqueada o programada para eliminación posterior conforme a las políticas operativas vigentes, incluyendo una ventana de retención temporal para validación, reactivación, prevención de abuso, seguridad o cumplimiento legal.",
    ],
  },
  {
    title: "7. Derechos ARCO y revocación del consentimiento",
    paragraphs: [
      "La persona titular puede solicitar acceso, rectificación, cancelación u oposición respecto de sus propios datos, así como revocar el consentimiento cuando legalmente proceda.",
      "La solicitud deberá incluir al menos nombre de la persona solicitante, medio de contacto para responder, relación con la cuenta o datos involucrados, una descripción clara de la solicitud y elementos razonables para identificar la información relacionada.",
    ],
  },
  {
    title: "8. Medidas, alcances y limitaciones",
    paragraphs: [
      "Agéndame implementa medidas razonables de carácter administrativo, técnico y operativo para proteger la información tratada dentro de la plataforma. Sin embargo, ningún entorno digital puede garantizar seguridad absoluta o invulnerabilidad total frente a incidentes, accesos no autorizados o eventos fuera del control razonable del prestador.",
      "El usuario también reconoce que la seguridad del servicio depende en parte del resguardo de sus accesos, contraseñas, dispositivos, cuentas y prácticas internas.",
    ],
  },
  {
    title: "9. Cambios al aviso y evolución del servicio",
    paragraphs: [
      "Agéndame podrá modificar este aviso para reflejar cambios legales, técnicos, operativos, comerciales o funcionales del servicio. La versión vigente será la publicada en los canales oficiales de la plataforma.",
      "La incorporación de nuevas funciones, módulos, planes, herramientas, mejoras o servicios en desarrollo no modifica por sí sola la naturaleza general de este aviso, salvo que exista un cambio material en el tratamiento de datos que deba informarse de forma adicional.",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Aviso de Privacidad"
      updatedAt="2 de agosto de 2026"
      intro="Este aviso describe de forma general qué datos puede tratar Agéndame, con qué finalidades y bajo qué criterios operativos, de seguridad y responsabilidad se gestiona la información dentro de la plataforma."
      sections={sections}
    />
  );
}
