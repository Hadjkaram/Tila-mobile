import { Alert, Share } from 'react-native';
import { PrescriptionItem } from './patient';

// Dynamic safe loading of expo-print and expo-sharing to prevent native crashes
let ExpoPrint: any = null;
let ExpoSharing: any = null;

try {
  ExpoPrint = require('expo-print');
} catch (e) {
  console.warn('[PrescriptionPDF] ExpoPrint native module not available yet');
}

try {
  ExpoSharing = require('expo-sharing');
} catch (e) {
  console.warn('[PrescriptionPDF] ExpoSharing native module not available yet');
}

export interface PrescriptionShareRecord {
  id: string;
  prescriptionId: number | string;
  recipientType: 'praticien' | 'centre' | 'externe';
  recipientName: string;
  sharedAt: string;
  notes?: string;
}

export async function generateAndSharePrescriptionPdf(
  prescription: PrescriptionItem,
  patientName?: string
): Promise<string | null> {
  const docName = prescription.doctorName || 'Médecin Référent';
  const patName = patientName || prescription.patientName || 'Bénéficiaire TILA';
  const dateStr = prescription.issuedAt || prescription.createdAt || new Date().toLocaleDateString('fr-FR');
  const matricule = prescription.doctorMatricule || 'CI-MED-04892';
  const ordNumber = `ORD-${String(prescription.id).padStart(5, '0')}`;

  const linesHtml = (prescription.lines || [])
    .map(
      (line, index) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 14px; font-size: 14px; font-weight: 700; color: #0f172a;">
          ${index + 1}. ${line.medication}
        </td>
        <td style="padding: 12px 14px; font-size: 13.5px; color: #334155;">
          ${line.posologie}
        </td>
      </tr>
    `
    )
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <title>Ordonnance Médicale - ${ordNumber}</title>
      <style>
        @page {
          size: A4;
          margin: 18mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 24px;
          background-color: #ffffff;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          border-bottom: 3px solid #00A651;
          padding-bottom: 16px;
          margin-bottom: 22px;
        }
        .brand-title {
          font-size: 24px;
          font-weight: 900;
          color: #00A651;
          margin: 0;
          letter-spacing: 0.5px;
        }
        .brand-subtitle {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 3px;
        }
        .doc-type {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          text-align: right;
        }
        .doc-number {
          font-size: 13px;
          font-weight: 700;
          color: #F58220;
          text-align: right;
        }
        .grid-info {
          width: 100%;
          margin-bottom: 24px;
        }
        .box-card {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 14px;
          vertical-align: top;
          width: 48%;
        }
        .box-title {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          font-weight: 700;
          color: #64748b;
          margin-bottom: 6px;
        }
        .person-name {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 4px;
        }
        .detail-text {
          font-size: 12.5px;
          color: #475569;
          line-height: 1.4;
        }
        .table-meds {
          width: 100%;
          border-collapse: collapse;
          margin-top: 14px;
          margin-bottom: 24px;
        }
        .table-meds th {
          background-color: #f1f5f9;
          color: #334155;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: left;
          padding: 10px 14px;
          border-bottom: 2px solid #cbd5e1;
        }
        .notes-card {
          background-color: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 8px;
          padding: 14px;
          margin-bottom: 26px;
        }
        .notes-title {
          font-size: 12px;
          font-weight: 700;
          color: #b45309;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .notes-text {
          font-size: 13px;
          color: #92400e;
          line-height: 1.4;
        }
        .signature-area {
          width: 100%;
          margin-top: 30px;
        }
        .stamp-box {
          border: 2px dashed #00A651;
          border-radius: 8px;
          padding: 16px;
          width: 230px;
          text-align: center;
          float: right;
          background-color: #f0fdf4;
        }
        .stamp-title {
          font-size: 11px;
          font-weight: 800;
          color: #00A651;
          text-transform: uppercase;
        }
        .stamp-sub {
          font-size: 10px;
          color: #166534;
          margin-top: 4px;
        }
        .footer-text {
          clear: both;
          border-top: 1px solid #e2e8f0;
          padding-top: 16px;
          margin-top: 50px;
          font-size: 10px;
          color: #94a3b8;
          text-align: center;
          line-height: 1.4;
        }
      </style>
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td style="width: 58%; vertical-align: middle;">
            <div style="display: flex; align-items: center;">
              <!-- Logo Vectoriel TILA -->
              <svg width="38" height="38" viewBox="0 0 40 40" fill="none" style="margin-right: 12px;">
                <rect width="40" height="40" rx="10" fill="#00A651" />
                <path d="M20 10C14.477 10 10 14.477 10 20C10 25.523 14.477 30 20 30C25.523 30 30 25.523 30 20" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
                <circle cx="20" cy="20" r="4" fill="#F58220" />
              </svg>
              <div>
                <h1 class="brand-title">TILA</h1>
                <div class="brand-subtitle">Plateforme Nationale de Santé Mentale</div>
                <div style="font-size: 10.5px; color: #475569; margin-top: 3px; font-weight: 600;">
                  Ministère de la Santé, de l'Hygiène Publique et de la CMU
                </div>
              </div>
            </div>
          </td>
          <td style="width: 42%; vertical-align: middle;">
            <div class="doc-type">ORDONNANCE MÉDICALE</div>
            <div class="doc-number">Réf : ${ordNumber}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px; text-align: right;">
              Délivrée le : <strong>${dateStr}</strong>
            </div>
          </td>
        </tr>
      </table>

      <!-- Fiches Prescripteur et Patient -->
      <table class="grid-info" cellspacing="0" cellpadding="0">
        <tr>
          <td class="box-card">
            <div class="box-title">Médecin Prescripteur</div>
            <div class="person-name">Dr. ${docName}</div>
            <div class="detail-text">Spécialité : Psychiatrie / Santé Mentale</div>
            <div class="detail-text">Matricule Ordre : <strong>${matricule}</strong></div>
            <div class="detail-text">Structure : Centre Partenaire Agréé TILA</div>
          </td>
          <td style="width: 4%;"></td>
          <td class="box-card">
            <div class="box-title">Bénéficiaire / Patient</div>
            <div class="person-name">${patName}</div>
            <div class="detail-text">Prise en charge : Téléconsultation TILA</div>
            <div class="detail-text">Date d'ordonnance : ${dateStr}</div>
            <div class="detail-text">Validité : 3 mois à compter de l'émission</div>
          </td>
        </tr>
      </table>

      <!-- Liste des médicaments -->
      <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">
        PRESCRIPTION THÉRAPEUTIQUE
      </div>
      <table class="table-meds">
        <thead>
          <tr>
            <th style="width: 50%;">Médicament & Dosage</th>
            <th style="width: 50%;">Posologie & Fréquence</th>
          </tr>
        </thead>
        <tbody>
          ${linesHtml || '<tr><td colspan="2" style="padding: 16px; text-align: center; color: #94a3b8;">Aucun médicament spécifié.</td></tr>'}
        </tbody>
      </table>

      ${
        prescription.notes
          ? `
        <div class="notes-card">
          <div class="notes-title">Instructions Particulières du Praticien</div>
          <div class="notes-text">${prescription.notes}</div>
        </div>
      `
          : ''
      }

      <div class="signature-area">
        <div class="stamp-box">
          <div class="stamp-title">Cachet & Signature Numérique</div>
          <div style="margin: 8px 0; font-size: 14px; font-weight: 700; color: #00A651;">
            Dr. ${docName}
          </div>
          <div class="stamp-sub">Certifié par la plateforme TILA</div>
          <div class="stamp-sub">Identifiant PNSM : ${matricule}</div>
        </div>
      </div>

      <div class="footer-text">
        Document médical officiel émis dans le cadre du Programme National de Santé Mentale (PNSM) TILA.<br />
        Soumis au secret médical professionnel (Art. L. 1110-4). Télémédecine agréée TILA.
      </div>
    </body>
    </html>
  `;

  // 1. Essai avec expo-print et expo-sharing
  if (ExpoPrint && ExpoPrint.printToFileAsync) {
    try {
      const { uri } = await ExpoPrint.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      if (ExpoSharing && ExpoSharing.isAvailableAsync && (await ExpoSharing.isAvailableAsync())) {
        await ExpoSharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `Ordonnance_${ordNumber}.pdf`,
        });
      } else {
        Alert.alert('PDF Généré', `Votre ordonnance est disponible : ${uri}`);
      }
      return uri;
    } catch (err) {
      console.warn('[PrescriptionPDF] Échec expo-print, recours au partage texte:', err);
    }
  }

  // 2. Recours fluide natif (Share.share) si le binaire n'a pas encore lié ExpoPrint
  const medsText = (prescription.lines || [])
    .map((l, i) => `${i + 1}. ${l.medication} - Posologie: ${l.posologie}`)
    .join('\n');

  const shareMessage = `ORDONNANCE MÉDICALE TILA (${ordNumber})\n` +
    `Prescripteur: Dr. ${docName} (Matricule: ${matricule})\n` +
    `Patient: ${patName}\n` +
    `Date: ${dateStr}\n\n` +
    `PRESCRIPTIONS:\n${medsText}\n\n` +
    (prescription.notes ? `Instructions: ${prescription.notes}\n\n` : '') +
    `Document certifié conforme par la plateforme de santé mentale TILA.`;

  await Share.share({
    title: `Ordonnance_${ordNumber}`,
    message: shareMessage,
  });

  return null;
}
