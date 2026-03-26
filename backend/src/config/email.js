// ============================================================
// CONFIGURACION DE EMAIL (Gmail SMTP)
// ============================================================
// Usa nodemailer para enviar correos via Gmail
// Requiere una "contraseña de aplicacion" de Google:
// https://myaccount.google.com/apppasswords
// ============================================================

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

/**
 * Enviar un correo electronico
 * @param {string} to - Email destino
 * @param {string} subject - Asunto
 * @param {string} html - Contenido HTML
 */
async function enviarEmail(to, subject, html) {
    const mailOptions = {
        from: `"¿Qué Plan?" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Email enviado a ${to}: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error('❌ Error enviando email:', error.message);
        throw error;
    }
}

/**
 * Genera el HTML del email de recuperacion de contraseña
 * @param {string} nombre - Nombre del usuario
 * @param {string} codigo - Codigo de 6 digitos
 */
function templateRecuperacion(nombre, codigo) {
    return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #FFF9F5; border-radius: 16px; overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #F26B3A, #F5A623); padding: 32px 24px; text-align: center;">
            <h1 style="color: white; font-size: 24px; margin: 0; font-weight: 700;">¿Qué Plan?</h1>
            <p style="color: rgba(255,255,255,0.85); font-size: 13px; margin: 6px 0 0;">Recuperación de contraseña</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px 24px;">
            <p style="color: #374151; font-size: 15px; margin: 0 0 16px;">
                Hola <strong>${nombre}</strong>,
            </p>
            <p style="color: #6B7280; font-size: 14px; margin: 0 0 24px; line-height: 1.5;">
                Recibimos una solicitud para restablecer tu contraseña. Usa el siguiente código para continuar:
            </p>

            <!-- Code -->
            <div style="background: white; border: 2px solid #F26B3A; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px;">
                <p style="color: #9CA3AF; font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Tu código</p>
                <p style="color: #F26B3A; font-size: 36px; font-weight: 700; letter-spacing: 8px; margin: 0;">${codigo}</p>
            </div>

            <p style="color: #9CA3AF; font-size: 12px; margin: 0 0 8px; text-align: center;">
                ⏱️ Este código expira en <strong>15 minutos</strong>.
            </p>
            <p style="color: #9CA3AF; font-size: 12px; margin: 0; text-align: center;">
                Si no solicitaste este cambio, puedes ignorar este correo.
            </p>
        </div>

        <!-- Footer -->
        <div style="background: #F3F4F6; padding: 16px 24px; text-align: center;">
            <p style="color: #9CA3AF; font-size: 11px; margin: 0;">
                © ${new Date().getFullYear()} ¿Qué Plan? — Cancún, México
            </p>
        </div>
    </div>`;
}

module.exports = { enviarEmail, templateRecuperacion };
