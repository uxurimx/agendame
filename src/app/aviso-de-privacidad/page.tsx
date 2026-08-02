import LegalPage from "@/components/legal/LegalPage";

export const metadata = {
  title: "Aviso de Privacidad — Agéndame",
  description: "Aviso de Privacidad vigente de Agéndame.",
};

const sections = [
  {
    title: "1. Responsable",
    paragraphs: [
      "POXELBIT SAS, con domicilio en Hermanos Flores Magón #3102, Infonavit Humaya, Culiacán, Sinaloa, México, C.P. 80020, es responsable del tratamiento de los datos personales recabados a través de Agéndame.",
    ],
    bullets: ["contacto@agendame.mx", "soporte@agendame.mx", "soporte@poxelbit.mx"],
  },
  {
    title: "2. Datos que podemos tratar",
    bullets: [
      "Datos de cuenta del negocio, como nombre, correo, teléfono, nombre comercial y datos básicos de operación.",
      "Datos de clientas o clientes capturados por el negocio usuario, como nombre, teléfono, correo, notas, historial de citas y preferencias.",
      "Imágenes o referencias visuales cargadas por el negocio usuario.",
      "Datos necesarios para acceso, seguridad, soporte, cobro, operación y continuidad del servicio.",
    ],
  },
  {
    title: "3. Finalidades",
    bullets: [
      "Crear, administrar y proteger la cuenta del negocio usuario.",
      "Operar la agenda, reservas, servicios, profesionales, clientas, citas y herramientas relacionadas.",
      "Procesar cobros, suscripciones, cambios de plan y solicitudes del usuario.",
      "Atender soporte, seguridad, prevención de fraude y cumplimiento legal.",
      "Mejorar y mantener el servicio.",
    ],
  },
  {
    title: "4. Datos de terceros capturados por el usuario",
    paragraphs: [
      "El negocio usuario es responsable de contar con base legal, aviso y autorizaciones necesarias para capturar datos de sus clientes dentro de Agéndame.",
      "Si el negocio usuario sube fotografías o referencias visuales que puedan identificar a una persona, declara que cuenta con autorización suficiente para dicho tratamiento.",
    ],
  },
  {
    title: "5. Acceso a la información",
    paragraphs: [
      "Agéndame no usa los datos del negocio usuario ni de sus clientes para fines ajenos a la operación del servicio. Sin embargo, sí puede acceder a cierta información cuando sea necesario para soporte técnico, mantenimiento, seguridad, prevención de fraude, investigación de incidentes o cumplimiento legal.",
    ],
  },
  {
    title: "6. Conservación y eliminación",
    paragraphs: [
      "Agéndame puede conservar la información mientras exista una relación activa con el negocio usuario y durante el tiempo necesario para fines operativos, legales, de seguridad, respaldo o resolución de controversias.",
      "Cuando el usuario solicite la eliminación de su cuenta, la cuenta puede quedar desactivada y programada para eliminación posterior. Actualmente Agéndame contempla una ventana operativa de hasta 30 días para retención temporal, reactivación, validación y proceso de eliminación correspondiente.",
    ],
  },
  {
    title: "7. Derechos ARCO",
    paragraphs: [
      "La persona titular puede solicitar acceso, rectificación, cancelación u oposición respecto de sus propios datos, así como revocar el consentimiento cuando legalmente proceda.",
      "La solicitud deberá incluir al menos nombre de la persona solicitante, medio de contacto para responder, relación con la cuenta o datos involucrados y una descripción clara de la solicitud.",
    ],
  },
  {
    title: "8. Cambios al aviso",
    paragraphs: [
      "Agéndame podrá modificar este aviso para reflejar cambios legales, técnicos, operativos o comerciales. La versión vigente deberá publicarse en los canales oficiales del servicio.",
      "Agéndame puede incorporar nuevas funciones, planes, mejoras o módulos en el tiempo. La aparición de funciones en desarrollo, preventa, prueba, próximo lanzamiento o construcción dentro del producto o materiales comerciales no implica disponibilidad inmediata para todos los usuarios, salvo que expresamente se indique lo contrario.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Aviso de Privacidad"
      updatedAt="2 de agosto de 2026"
      intro="Este aviso describe, de forma general, qué datos usa Agéndame y para qué fines dentro de la operación del servicio."
      sections={sections}
    />
  );
}
