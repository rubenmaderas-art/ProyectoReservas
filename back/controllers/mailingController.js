const { sendTestReservationMail } = require('../utils/reservationMailer');

exports.sendTestMail = async (req, res) => {
  try {
    const recipient = req.body?.recipient || null;

    const result = await sendTestReservationMail({
      recipient,
      actorUserId: req.user?.id ?? null,
      actorRole: req.user?.role ?? 'system',
    });

    if (result?.skipped) {
      return res.status(400).json({
        error: 'No se pudo preparar el correo de prueba',
        reason: result.reason || 'unknown',
      });
    }

    return res.json({
      message: 'Correo de prueba preparado correctamente',
      recipient: result.recipient,
      transportMode: result.transportMode,
      eventType: result.eventType,
    });
  } catch (error) {
    console.error('Error enviando correo de prueba:', error);
    return res.status(500).json({
      error: 'Error al enviar el correo de prueba',
    });
  }
};
