const auditLogger = require('./auditLogger');
const { sendMail, resolveRecipient } = require('./mailer');

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'full',
  timeStyle: 'short',
});

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizeStatus = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, '-');

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return DATE_TIME_FORMATTER.format(date);
};

const getBrandName = () => 'MACROSAD'.trim();
const getLogoUrl = () => String(process.env.MAIL_LOGO_URL || '').trim();

const MAIL_EVENT_CONFIG = {
  approved: {
    subject: 'Tu reserva ha sido aprobada',
    title: 'Reserva aprobada',
    accent: '#db2777',
    intro: 'Tu reserva ha sido aprobada y ya puede seguir su curso normal.',
  },
  active: {
    subject: 'Tu reserva está activa',
    title: 'Reserva activa',
    accent: '#db2777',
    intro: 'Tu reserva ha pasado a estado activo. Ya puedes hacer uso del vehículo en la franja reservada.',
  },
  rejected: {
    subject: 'Tu reserva ha sido cancelada',
    title: 'Reserva cancelada',
    accent: '#db2777',
    intro: 'Tu reserva ha sido cancelada o rechazada.',
  },
  deleted: {
    subject: 'Tu reserva ha sido eliminada',
    title: 'Reserva eliminada',
    accent: '#db2777',
    intro: 'La reserva ha sido eliminada del sistema.',
  },
  test: {
    subject: 'Correo de prueba del sistema de reservas',
    title: 'Correo de prueba',
    accent: '#db2777',
    intro: 'Este mensaje confirma que la configuración de correo está respondiendo correctamente.',
  },
};

const getReservationRecipient = (reservation, fallbackRecipient = null) => {
  const explicitRecipient = resolveRecipient(fallbackRecipient, { allowTestRecipient: true });
  if (explicitRecipient) return explicitRecipient;

  return resolveRecipient(reservation?.username);
};

const buildReservationText = ({ reservation, eventType }) => {
  const config = MAIL_EVENT_CONFIG[eventType] || MAIL_EVENT_CONFIG.test;
  const lines = [
    `${config.title}`,
    '',
    config.intro,
    '',
    `Usuario: ${reservation?.username ?? '-'}`,
    `Vehículo: ${reservation?.model ?? '-'} (${reservation?.license_plate ?? '-'})`,
    `Inicio: ${formatDateTime(reservation?.start_time)}`,
    `Fin: ${formatDateTime(reservation?.end_time)}`,
    `Estado: ${reservation?.status ?? '-'}`,
  ];

  if (reservation?.centre_name) {
    lines.push(`Centro: ${reservation.centre_name}`);
  }

  return lines.join('\n');
};

const buildReservationHtml = ({ reservation, eventType }) => {
  const config = MAIL_EVENT_CONFIG[eventType] || MAIL_EVENT_CONFIG.test;
  const rows = [
    ['Usuario', reservation?.username ?? '-'],
    ['Vehículo', `${reservation?.model ?? '-'} (${reservation?.license_plate ?? '-'})`],
    ['Inicio', formatDateTime(reservation?.start_time)],
    ['Fin', formatDateTime(reservation?.end_time)],
    ['Estado', reservation?.status ?? '-'],
  ];

  if (reservation?.centre_name) {
    rows.push(['Centro', reservation.centre_name]);
  }

  // font-weight:bold (no valores numéricos — Outlook no interpola fuentes del sistema)
  // line-height en px absolutos: 14px * 1.5 = 21px
  const rowsHtml = rows
    .map(([label, value]) => `
      <tr>
        <td width="140" style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-weight:bold;font-family:Arial,sans-serif;font-size:14px;line-height:21px;">${escapeHtml(label)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-family:Arial,sans-serif;font-size:14px;line-height:21px;">${escapeHtml(value)}</td>
      </tr>
    `)
    .join('');

  const brandName = escapeHtml(getBrandName());
  // AVISO: MAIL_LOGO_URL (o FRONTEND_URL/isotipo-petalos.png) debe apuntar a PNG o JPG — SVG no soportado en clientes de correo.
  const rawLogoUrl = getLogoUrl() || (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/isotipo-petalos.png` : '');
  const logoUrl = rawLogoUrl.replace(/\.svg(\?.*)?$/, '.png$1');

  // rgba(255,255,255,0.18) sobre #db2777 → equivalente sólido #e14e8f
  // line-height:64px centra el inicial verticalmente en la celda de altura fija
  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${brandName}" width="64" height="64" style="display:block;width:64px;height:64px;border-radius:18px;background-color:#ffffff;padding:8px;" />`
    : `<table cellpadding="0" cellspacing="0" border="0" width="64" role="presentation"><tr><td width="64" height="64" align="center" valign="middle" style="border-radius:18px;background-color:#e14e8f;font-size:22px;font-weight:bold;line-height:64px;letter-spacing:.04em;color:#ffffff;font-family:Arial,sans-serif;">${brandName.slice(0, 1).toUpperCase()}</td></tr></table>`;

  // color:#fbe9f1 = equivalente sólido de #ffffff con opacity:.9 sobre #db2777
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(config.title)}</title>
  <style type="text/css">
    table { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img   { -ms-interpolation-mode: bicubic; border: 0; display: block; }
  </style>
</head>
<!--
  <body> sin estilos de fondo: el fondo lo gestionan la Ghost Table (MSO)
  y el <div> wrapper (Gmail/Outlook.com), para no depender del <body>.
-->
<body style="margin:0;padding:0;">
  <!--[if mso]>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eef2ff">
    <tr><td>
  <![endif]-->
  <div style="background-color:#eef2ff;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#eef2ff;">
      <tr>
        <td align="center" style="padding:32px 20px;">

          <!--[if mso]><table width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
          <table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation" style="width:600px;max-width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:20px;">

            <!-- CABECERA -->
            <tr>
              <td style="padding:24px 28px;background-color:${config.accent};border-radius:20px 20px 0 0;">
                <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                  <tr>
                    <td width="80" style="padding-right:14px;vertical-align:middle;">
                      ${logoHtml}
                    </td>
                    <td style="vertical-align:middle;">
                      <!--
                        <p> y <h1> eliminados: Outlook añade márgenes propios no sobreescribibles.
                        Todo el texto vive directamente en <td> con line-height en px.
                        12px * 1.4 = 17px | 24px * 1.2 = 29px
                      -->
                      <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                        <tr>
                          <td style="padding-bottom:6px;font-size:12px;line-height:17px;letter-spacing:.12em;text-transform:uppercase;color:#fbe9f1;font-family:Arial,sans-serif;">
                            ${brandName}
                          </td>
                        </tr>
                        <tr>
                          <td style="font-size:24px;line-height:29px;color:#ffffff;font-family:Arial,sans-serif;font-weight:bold;">
                            ${escapeHtml(config.title)}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- INTRO: 15px * 1.6 = 24px -->
            <tr>
              <td style="padding:28px 28px 0 28px;font-family:Arial,sans-serif;font-size:15px;line-height:24px;color:#334155;">
                ${escapeHtml(config.intro)}
              </td>
            </tr>

            <!-- CAJA INFORMATIVA: 13px * 1.6 = 21px -->
            <tr>
              <td style="padding:20px 28px 0 28px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-radius:16px;background-color:#f8fafc;border:1px solid #e2e8f0;">
                  <tr>
                    <td style="padding:16px 18px;color:#475569;font-size:13px;line-height:21px;font-family:Arial,sans-serif;">
                      Te escribimos para mantenerte informado sobre el estado de tu reserva.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- ESPACIADO FIJO: margin no es fiable en Outlook -->
            <tr>
              <td height="20" style="font-size:20px;line-height:20px;mso-line-height-rule:exactly;">&nbsp;</td>
            </tr>

            <!-- TABLA DE DATOS -->
            <tr>
              <td style="padding:0 28px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:14px;background-color:#ffffff;">
                  <tbody>${rowsHtml}</tbody>
                </table>
              </td>
            </tr>

            <!-- PIE: 12px * 1.5 = 18px -->
            <tr>
              <td style="padding:20px 28px 28px 28px;color:#64748b;font-size:12px;line-height:18px;font-family:Arial,sans-serif;">
                Este correo se ha generado automáticamente desde el sistema de reservas de ${brandName}. Si no esperabas este mensaje, contacta con el equipo de administración.
              </td>
            </tr>

          </table>
          <!--[if mso]></td></tr></table><![endif]-->

        </td>
      </tr>
    </table>
  </div>
  <!--[if mso]>
    </td></tr>
  </table>
  <![endif]-->
</body>
</html>`;
};

const getReservationMailEventType = ({ previousStatus, currentStatus, action }) => {
  const next = normalizeStatus(currentStatus);
  const previous = normalizeStatus(previousStatus);

  if (action === 'deleted') return 'deleted';

  if (action === 'created') {
    if (next === 'aprobada') return 'approved';
    if (next === 'activa') return 'active';
    if (next === 'rechazada') return 'rejected';
    return null;
  }

  if (action === 'updated') {
    if (previous === next) return null;
    if (next === 'aprobada') return 'approved';
    if (next === 'activa') return 'active';
    if (next === 'rechazada') return 'rejected';
    return null;
  }

  return null;
};

const sendReservationNotification = async ({
  reservation,
  previousStatus = null,
  currentStatus = null,
  action = 'updated',
  actorUserId = null,
  actorRole = 'system',
  recipient = null,
}) => {
  const eventType = getReservationMailEventType({ previousStatus, currentStatus, action });
  if (!eventType) {
    return { skipped: true, reason: 'irrelevant_status_change' };
  }

  const finalRecipient = getReservationRecipient(reservation, recipient);
  if (!finalRecipient) {
    await auditLogger.logAction(actorUserId, 'MAIL', 'reservations', reservation?.id ?? 0, actorRole, {
      eventType,
      status: normalizeStatus(currentStatus),
      skipped: true,
      reason: 'recipient_missing',
    });

    return {
      skipped: true,
      reason: 'recipient_missing',
      eventType,
    };
  }

  const subject = MAIL_EVENT_CONFIG[eventType]?.subject || MAIL_EVENT_CONFIG.test.subject;
  const text = buildReservationText({ reservation, eventType });
  const html = buildReservationHtml({ reservation, eventType });
  const result = await sendMail({
    to: finalRecipient,
    subject,
    text,
    html,
  });

  await auditLogger.logAction(actorUserId, 'MAIL', 'reservations', reservation?.id ?? 0, actorRole, {
    eventType,
    recipient: result.recipient,
    transportMode: result.transportMode,
    messageId: result.messageId,
    status: normalizeStatus(currentStatus),
  });

  return {
    ...result,
    eventType,
    subject,
  };
};

const sendTestReservationMail = async ({
  recipient = null,
  actorUserId = null,
  actorRole = 'system',
}) => {
  const sampleReservation = {
    id: 0,
    username: recipient || 'usuario.de.prueba@macrosad.com',
    model: 'Vehículo de prueba',
    license_plate: 'PRUEBA-000',
    start_time: new Date(),
    end_time: new Date(Date.now() + 60 * 60 * 1000),
    status: 'aprobada',
    centre_name: 'Centro de pruebas',
  };

  return sendReservationNotification({
    reservation: sampleReservation,
    currentStatus: 'aprobada',
    action: 'updated',
    actorUserId,
    actorRole,
    recipient,
  });
};

module.exports = {
  getReservationMailEventType,
  sendReservationNotification,
  sendTestReservationMail,
  buildReservationText,
  buildReservationHtml,
};
