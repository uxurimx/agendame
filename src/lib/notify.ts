import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface TicketPayload {
  ticketId:     string;
  title:        string;
  type:         string;
  priority:     string;
  description:  string;
  businessName: string;
  userEmail:    string;
  status?:      string;
  response?:    string;
}

const TYPE_LABEL: Record<string, string> = {
  bug:        "🐛 Bug",
  mejora:     "✨ Mejora",
  soporte:    "🛟 Soporte",
  sugerencia: "💡 Sugerencia",
  otro:       "💬 Otro",
};
const PRIORITY_LABEL: Record<string, string> = {
  baja:    "Baja",
  media:   "Media",
  alta:    "Alta",
  urgente: "🔴 URGENTE",
};

export async function notifyNewTicket(data: TicketPayload) {
  const adminEmail = process.env.NOTIFY_EMAIL ?? process.env.ADMIN_EMAIL ?? "torresdevmx@gmail.com";

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:linear-gradient(135deg,#6E2A96,#E8631F);border-radius:12px;padding:20px 24px;margin-bottom:24px">
        <p style="color:rgba(255,255,255,.7);font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:.1em">POXELBIT · Soporte técnico</p>
        <h1 style="color:#fff;font-size:20px;margin:0">Nuevo ticket de soporte</h1>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;font-size:13px;width:120px">Negocio</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px;font-weight:600">${data.businessName}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;font-size:13px">Email</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px">${data.userEmail}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;font-size:13px">Tipo</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px">${TYPE_LABEL[data.type] ?? data.type}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;font-size:13px">Prioridad</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px">${PRIORITY_LABEL[data.priority] ?? data.priority}</td></tr>
        <tr><td style="padding:8px 0;color:#666;font-size:13px">ID</td><td style="padding:8px 0;font-size:12px;color:#999">${data.ticketId}</td></tr>
      </table>
      <div style="background:#f7f5fa;border-radius:10px;padding:16px;margin-bottom:20px">
        <p style="font-size:15px;font-weight:700;margin:0 0 8px;color:#1a1420">${data.title}</p>
        <p style="font-size:13px;color:#444;margin:0;line-height:1.6;white-space:pre-wrap">${data.description}</p>
      </div>
      <a href="https://www.agendame.mx/support" style="display:inline-block;background:#6E2A96;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px">Ver ticket en panel →</a>
      <p style="font-size:11px;color:#aaa;margin-top:24px">Agéndame · Poxelbit Support</p>
    </div>
  `;

  // 1. Resend email al admin
  // RESEND_FROM: dominio verificado ej "soporte@agendame.mx" — sin él, solo envía al email de tu cuenta Resend
  const fromAddr = process.env.RESEND_FROM ?? "onboarding@resend.dev";
  if (process.env.RESEND_API_KEY) {
    await resend.emails.send({
      from:    `Poxelbit Soporte <${fromAddr}>`,
      to:      adminEmail,
      subject: `[${PRIORITY_LABEL[data.priority] ?? data.priority}] ${TYPE_LABEL[data.type] ?? data.type}: ${data.title}`,
      html,
    }).catch((e) => console.error("[notify] Resend error:", e));
  }

  // 2. devmon bus via webhook (si el usuario expone un endpoint local)
  if (process.env.DEVMON_WEBHOOK_URL) {
    await fetch(process.env.DEVMON_WEBHOOK_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source:  "agendame",
        title:   `[${data.type}] ${data.title}`,
        body:    `${data.businessName} (${data.userEmail}): ${data.description.slice(0, 200)}`,
        urgency: data.priority === "urgente" ? "high" : data.priority === "alta" ? "medium" : "low",
      }),
      signal: AbortSignal.timeout(4000),
    }).catch(() => {}); // fail silently si el webhook local no está disponible
  }
}

export async function notifyTicketResponse(to: string, data: TicketPayload) {
  if (!process.env.RESEND_API_KEY) return;

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:linear-gradient(135deg,#6E2A96,#E8631F);border-radius:12px;padding:20px 24px;margin-bottom:24px">
        <p style="color:rgba(255,255,255,.7);font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:.1em">POXELBIT · Soporte técnico</p>
        <h1 style="color:#fff;font-size:20px;margin:0">Tu ticket fue respondido</h1>
      </div>
      <p style="font-size:14px;color:#444;margin-bottom:16px">Hemos respondido tu ticket <strong>${data.title}</strong>:</p>
      <div style="background:#f7f5fa;border-left:4px solid #6E2A96;border-radius:0 10px 10px 0;padding:16px;margin-bottom:20px">
        <p style="font-size:13px;color:#444;margin:0;line-height:1.6;white-space:pre-wrap">${data.response ?? ""}</p>
      </div>
      <a href="https://www.agendame.mx/support" style="display:inline-block;background:#6E2A96;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px">Ver en mi panel →</a>
    </div>
  `;

  const fromAddr = process.env.RESEND_FROM ?? "onboarding@resend.dev";
  await resend.emails.send({
    from:    `Poxelbit Soporte <${fromAddr}>`,
    to,
    subject: `Re: ${data.title} — Poxelbit Soporte`,
    html,
  }).catch((e) => console.error("[notify] Resend response error:", e));
}
