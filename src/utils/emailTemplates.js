export const mailText = function (name, otp) {
  const text = `Hello ${name},
  Here is your OTP: ${otp}
  This OTP will expire in 5 minures.
  
  If you did not request this, please ignore this email.`;

  return text;
};

export const mailHTML = function (name, otp) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>OTP Verification</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f9fc;font-family:Arial,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td align="center" style="padding:40px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="360" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#f08c00;padding:16px 24px;color:#ffffff;font-size:18px;font-weight:bold;text-align:center;">
              OTP Verification
            </td>
          </tr>
          <tr>
            <td style="padding:24px;text-align:center;color:#333;">
              <p style="font-size:16px;margin-bottom:8px;"><strong>${name}</strong>, here is your one-time verification code:</p>
              <div style="font-size:28px;letter-spacing:4px;font-weight:bold;color:#f08c00;margin:16px 0;">
                ${otp}
              </div>
              <p style="font-size:14px;color:#666;">This code will expire in 5 minutes.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;padding:16px;text-align:center;font-size:12px;color:#999;">
              If you did not request this, you can safely ignore this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return html;
};

export const songReportTextMail = function (
  name,
  songName,
  reportReason = null,
  currentReports = null
) {
  const text = `Song Report Notification - Fortissimo

Dear ${name},

We wanted to inform you that your song has been reported by another user on Fortissimo.

Song: ${songName}${
    reportReason
      ? `
Reason: ${reportReason}`
      : ""
  }${
    currentReports !== null
      ? `
Total Reports: ${currentReports}/100`
      : ""
  }

IMPORTANT: If your song receives 100 or more reports, it will be automatically removed from our platform. We recommend reviewing your upload to ensure it complies with our community guidelines and copyright policies.

Consider editing or re-uploading your song if you believe there may be any issues with the content, audio quality, or licensing. This will help prevent further reports and potential removal.

Thank you for your understanding.

The Fortissimo Team
Keep the music playing

---
This is an automated notification from Fortissimo. Please do not reply to this email.`;

  return text;
};

export const songReportMailHTML = function (
  name,
  songName,
  reportReason = null,
  currentReports = null
) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Song Report Notification</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f9fc;font-family:Arial,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td align="center" style="padding:40px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="400" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#f08c00;padding:16px 24px;color:#ffffff;font-size:18px;font-weight:bold;text-align:center;">
              Song Report Notification
            </td>
          </tr>
          <tr>
            <td style="padding:24px;color:#333;">
              <p style="font-size:16px;margin-bottom:16px;">Dear <strong>${name}</strong>,</p>
              
              <p style="font-size:14px;line-height:1.5;margin-bottom:16px;">
                We wanted to inform you that your song has been reported by another user on Fortissimo.
              </p>
              
              <div style="background-color:#fff3e6;border-left:4px solid #f08c00;padding:16px;margin:16px 0;border-radius:4px;">
                <p style="margin:0;font-size:14px;"><strong>Song:</strong> ${songName}</p>
                ${reportReason ? `<p style="margin:8px 0 0 0;font-size:14px;"><strong>Reason:</strong> ${reportReason}</p>` : ""}
                ${currentReports !== null ? `<p style="margin:8px 0 0 0;font-size:14px;"><strong>Total Reports:</strong> ${currentReports}/100</p>` : ""}
              </div>
              
              <p style="font-size:14px;line-height:1.5;margin-bottom:16px;">
                <strong>Important:</strong> If your song receives 100 or more reports, it will be automatically removed from our platform. 
                We recommend reviewing your upload to ensure it complies with our community guidelines and copyright policies.
              </p>
              
              <p style="font-size:14px;line-height:1.5;margin-bottom:16px;">
                Consider editing or re-uploading your song if you believe there may be any issues with the content, 
                audio quality, or licensing. This will help prevent further reports and potential removal.
              </p>
              
              <p style="font-size:14px;line-height:1.5;margin-bottom:0;">
                Thank you for your understanding.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;padding:16px;text-align:center;font-size:12px;color:#999;">
              The Fortissimo Team<br/>
              <span style="color:#f08c00;">Keep the music playing</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return html;
};
