import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from core.config import settings


def _get_api() -> sib_api_v3_sdk.TransactionalEmailsApi:
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key["api-key"] = settings.brevo_api_key
    return sib_api_v3_sdk.TransactionalEmailsApi(
        sib_api_v3_sdk.ApiClient(configuration)
    )


def _build_confirmation_html(first_name: str) -> str:
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Application Received — Chathurya</title>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:'DM Sans',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 20px;">
  <tr>
    <td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0f0f0f;border:1px solid #222222;border-radius:16px;overflow:hidden;max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="padding:40px 40px 32px;border-bottom:1px solid #1e1e1e;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-family:Arial,sans-serif;font-weight:900;font-size:20px;color:#FEFFFE;letter-spacing:-0.04em;">Chathurya</span>
                  <br>
                  <span style="font-family:'Courier New',monospace;font-size:10px;color:#555555;letter-spacing:0.12em;text-transform:uppercase;">Student Developers Club</span>
                </td>
                <td align="right">
                  <span style="display:inline-block;padding:5px 12px;background:rgba(207,255,0,0.08);border:1px solid rgba(207,255,0,0.2);border-radius:99px;font-family:'Courier New',monospace;font-size:10px;color:#CFFF00;letter-spacing:0.1em;">APPLICATION RECEIVED</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">

            <p style="font-family:'Courier New',monospace;font-size:11px;color:#CFFF00;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 20px;">// welcome to the circle</p>

            <h1 style="font-family:Arial,sans-serif;font-weight:900;font-size:32px;color:#FEFFFE;letter-spacing:-0.04em;line-height:1;margin:0 0 24px;">
              Hey {first_name},<br>
              <span style="color:#CFFF00;">you applied. 🎉</span>
            </h1>

            <p style="font-size:15px;color:#888888;line-height:1.75;margin:0 0 16px;font-weight:300;">
              Your application to join <strong style="color:#d0d0d0;font-weight:500;">Chathurya Student Developers Club</strong> has landed safely with us. We've received everything — and we're genuinely excited to read through it.
            </p>

            <p style="font-size:15px;color:#888888;line-height:1.75;margin:0 0 32px;font-weight:300;">
              Our leads will review your profile carefully. If you're selected, you'll receive a <strong style="color:#CFFF00;font-weight:500;">personalised invite link</strong> straight to this inbox to complete your onboarding.
            </p>

            <!-- Status card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(207,255,0,0.04);border:1px solid rgba(207,255,0,0.12);border-radius:12px;margin-bottom:32px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="font-family:'Courier New',monospace;font-size:10px;color:#CFFF00;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 12px;">What happens next</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:6px 0;font-size:13px;color:#888888;">
                        <span style="color:#CFFF00;margin-right:10px;">01</span> Application under review by club leads
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:13px;color:#888888;">
                        <span style="color:#555555;margin-right:10px;">02</span> Personal invite email sent if selected
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:13px;color:#888888;">
                        <span style="color:#555555;margin-right:10px;">03</span> Complete onboarding &amp; get your NFC card
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:13px;color:#888888;">
                        <span style="color:#555555;margin-right:10px;">04</span> Join the community — workshops, XP &amp; more ⚡
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="font-size:14px;color:#555555;line-height:1.7;margin:0;font-style:italic;">
              "The experiences, the friends you'll make, the things you'll build — it's all waiting. Stay tuned." 🚀
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #1e1e1e;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="font-family:'Courier New',monospace;font-size:10px;color:#333333;margin:0;letter-spacing:0.08em;">
                    // Chathurya SDC · Seshadripuram College · Bengaluru
                  </p>
                </td>
                <td align="right">
                  <p style="font-family:'Courier New',monospace;font-size:10px;color:#333333;margin:0;">
                    chathuryastudentdevclub@gmail.com
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>
"""
def _build_invite_html(first_name: str, invite_token: str) -> str:
    invite_url = f"{settings.frontend_url}/onboard?token={invite_token}"
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>You're In — Chathurya</title>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:'DM Sans',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 20px;">
  <tr>
    <td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0f0f0f;border:1px solid #222222;border-radius:16px;overflow:hidden;max-width:560px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="padding:40px 40px 32px;border-bottom:1px solid #1e1e1e;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-family:Arial,sans-serif;font-weight:900;font-size:20px;color:#FEFFFE;letter-spacing:-0.04em;">Chathurya</span>
                  <br>
                  <span style="font-family:'Courier New',monospace;font-size:10px;color:#555555;letter-spacing:0.12em;text-transform:uppercase;">Student Developers Club</span>
                </td>
                <td align="right">
                  <span style="display:inline-block;padding:5px 12px;background:rgba(207,255,0,0.08);border:1px solid rgba(207,255,0,0.2);border-radius:99px;font-family:'Courier New',monospace;font-size:10px;color:#CFFF00;letter-spacing:0.1em;">YOU'RE ACCEPTED</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="font-family:'Courier New',monospace;font-size:11px;color:#CFFF00;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 20px;">// welcome aboard</p>
            <h1 style="font-family:Arial,sans-serif;font-weight:900;font-size:32px;color:#FEFFFE;letter-spacing:-0.04em;line-height:1;margin:0 0 24px;">
              {first_name},<br>
              <span style="color:#CFFF00;">you're in. 🚀</span>
            </h1>
            <p style="font-size:15px;color:#888888;line-height:1.75;margin:0 0 16px;font-weight:300;">
              Congratulations! Your application to <strong style="color:#d0d0d0;font-weight:500;">Chathurya Student Developers Club</strong> has been approved. We're thrilled to have you join the community.
            </p>
            <p style="font-size:15px;color:#888888;line-height:1.75;margin:0 0 32px;font-weight:300;">
              Click the button below to complete your onboarding and claim your member profile. This link expires in <strong style="color:#CFFF00;font-weight:500;">7 days</strong>.
            </p>
            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td style="background:#CFFF00;border-radius:10px;padding:14px 32px;">
                  <a href="{invite_url}" style="font-family:Arial,sans-serif;font-weight:700;font-size:14px;color:#000000;text-decoration:none;letter-spacing:-0.02em;">Complete Onboarding →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #1e1e1e;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="font-family:'Courier New',monospace;font-size:10px;color:#333333;margin:0;letter-spacing:0.08em;">
                    // Chathurya SDC · Seshadripuram College · Bengaluru
                  </p>
                </td>
                <td align="right">
                  <p style="font-family:'Courier New',monospace;font-size:10px;color:#333333;margin:0;">
                    chathuryastudentdevclub@gmail.com
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
"""


async def send_application_confirmation(
    first_name: str,
    last_name: str,
    to_email: str,
) -> bool:
    """
    Send the personalised application confirmation email via Brevo.
    Returns True on success, False on failure (non-blocking).
    """
    api = _get_api()

    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": to_email, "name": f"{first_name} {last_name}"}],
        sender={
            "email": settings.sender_email,
            "name": settings.sender_name,
        },
        subject=f"Hey {first_name}, your Chathurya application is in ⚡",
        html_content=_build_confirmation_html(first_name),
        headers={"X-Mailin-TrackClicks": "0"},
    )

    try:
        api.send_transac_email(send_smtp_email)
        return True
    except ApiException as e:
        # Log but don't crash — email failure shouldn't block registration
        print(f"[Brevo] Failed to send confirmation to {to_email}: {e}")
        return False
    
async def send_invite_email(
    first_name: str,
    last_name: str,
    to_email: str,
    invite_token: str,
) -> bool:
    """
    Send the personalised invite/acceptance email via Brevo.
    Returns True on success, False on failure (non-blocking).
    """
    api = _get_api()
    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": to_email, "name": f"{first_name} {last_name}"}],
        sender={
            "email": settings.sender_email,
            "name": settings.sender_name,
        },
        subject=f"You're in, {first_name}! Complete your Chathurya onboarding 🚀",
        html_content=_build_invite_html(first_name, invite_token),
        headers={"X-Mailin-custom": "custom_header_1:custom_value_1"},
        params={"DISABLE_CLICK_TRACKING": True},
    )
    try:
        api.send_transac_email(send_smtp_email)
        return True
    except ApiException as e:
        print(f"[Brevo] Failed to send invite to {to_email}: {e}")
        return False
