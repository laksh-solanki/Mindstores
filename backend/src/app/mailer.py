from __future__ import annotations

import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, parseaddr
from pathlib import Path
from typing import TYPE_CHECKING, Any

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

if TYPE_CHECKING:
    from .config import AppConfig

logger = logging.getLogger("mindstores.mailer")


def send_otp_email(
    to_email: str,
    otp: str,
    config: Any = None,
    expires_minutes: int = 10,
) -> tuple[bool, str]:
    """Send an OTP code to the given email address.
    Returns (success: bool, detail: str).
    """
    to_email = str(to_email or "").strip().lower()
    otp = str(otp or "").strip()
    if not to_email or not otp:
        return False, "Recipient email and OTP are required"

    # Always re-read .env to pick up any changes without requiring a full server restart
    if load_dotenv:
        env_candidates = [
            Path(__file__).resolve().parents[2] / ".env",
            Path.cwd() / ".env",
            Path.cwd() / "backend" / ".env",
        ]
        for env_path in env_candidates:
            if env_path.exists():
                load_dotenv(env_path, override=True)
                break

    smtp_host = str(getattr(config, "smtp_host", "") or os.environ.get("SMTP_HOST", "")).strip()
    try:
        smtp_port = int(getattr(config, "smtp_port", 0) or os.environ.get("SMTP_PORT", 587))
    except (TypeError, ValueError):
        smtp_port = 587

    smtp_user = str(getattr(config, "smtp_user", "") or os.environ.get("SMTP_USER", "")).strip()
    raw_password = str(getattr(config, "smtp_password", "") or os.environ.get("SMTP_PASSWORD", "")).strip()
    # Strip spaces from app password if present (e.g. Google formats as 'xxxx xxxx xxxx xxxx')
    smtp_password = raw_password.replace(" ", "")

    raw_from = str(
        getattr(config, "smtp_from", "")
        or os.environ.get("SMTP_FROM", "")
        or os.environ.get("SMTP_FROM_EMAIL", "")
        or smtp_user
        or "noreply@mindstores.com"
    ).strip()

    smtp_tls_val = getattr(config, "smtp_tls", None)
    if smtp_tls_val is None:
        smtp_tls = os.environ.get("SMTP_TLS", "true").lower() in ("true", "1", "yes")
    else:
        smtp_tls = bool(smtp_tls_val)

    smtp_ssl_val = getattr(config, "smtp_ssl", None)
    if smtp_ssl_val is None:
        smtp_ssl = os.environ.get("SMTP_SSL", "false").lower() in ("true", "1", "yes")
    else:
        smtp_ssl = bool(smtp_ssl_val)

    sender_name, sender_email = parseaddr(raw_from)
    envelope_from = sender_email or smtp_user or "noreply@mindstores.com"
    header_from = formataddr((sender_name or "Mindstores", envelope_from))

    subject = f"Mindstores - User Admin Verification OTP: {otp}"
    plain_text = (
        f"====================================================\n"
        f"MINDSTORES • USER ADMIN ACCESS\n"
        f"====================================================\n\n"
        f"You requested access to the Mindstores User Admin Console.\n\n"
        f"YOUR ONE-TIME VERIFICATION CODE:\n"
        f"----------------------------------------------------\n"
        f"   >>>  {otp}  <<<\n"
        f"----------------------------------------------------\n\n"
        f"⏱ This code is valid for {expires_minutes} minutes.\n\n"
        f"SECURITY CHECKLIST:\n"
        f"• Single-use token: This code can only be submitted once.\n"
        f"• Never share this OTP: Mindstores staff will never ask for it.\n"
        f"• If you did not request this OTP, you can safely disregard this email.\n\n"
        f"====================================================\n"
        f"Mindstores Automated Security Gateway\n"
        f"Sent securely to: {to_email}\n"
        f"© Mindstores. All rights reserved.\n"
        f"====================================================\n"
    )

    html_content = f"""<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <!--[if !mso]><!-->
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <!--<![endif]-->
    <title>Mindstores User Admin Verification</title>
    <style type="text/css">
      body, table, td, a {{ -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
      table, td {{ mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
      img {{ -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }}
      body {{ margin: 0; padding: 0; width: 100% !important; background-color: #f1f5f9; }}
      @media only screen and (max-width: 600px) {{
        .email-outer-td {{ padding: 12px 8px !important; }}
        .email-card-frame {{ width: 100% !important; max-width: 100% !important; }}
        .email-header-padding {{ padding: 20px 18px !important; }}
        .email-body-padding {{ padding: 24px 18px !important; }}
        .email-footer-padding {{ padding: 18px 18px !important; }}
        .otp-digits {{ font-size: 32px !important; letter-spacing: 8px !important; }}
        .email-title {{ font-size: 22px !important; }}
      }}
    </style>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; min-height: 100vh;">
      <tr>
        <td align="center" class="email-outer-td" style="padding: 40px 16px;">
          <!-- Main Frame Table -->
          <table role="presentation" class="email-card-frame" border="0" cellpadding="0" cellspacing="0" width="560" style="max-width: 560px; width: 100%; background-color: #ffffff; border: 2px solid #0f172a; box-shadow: 6px 6px 0px #0f172a; border-collapse: separate;">
            
            <!-- Header Bar -->
            <tr>
              <td class="email-header-padding" style="background-color: #0f172a; padding: 22px 28px; border-bottom: 2px solid #0d9488;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td align="left" style="vertical-align: middle;">
                      <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; font-weight: 900; letter-spacing: 2px; color: #ffffff; text-transform: uppercase;">
                        MINDSTORES
                      </span>
                      <span style="display: inline-block; width: 6px; height: 6px; background-color: #0d9488; margin-left: 3px; vertical-align: baseline;"></span>
                    </td>
                    <td align="right" style="vertical-align: middle;">
                      <span style="display: inline-block; background-color: rgba(13, 148, 136, 0.2); border: 1px solid #0d9488; color: #2dd4bf; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; padding: 4px 10px; text-transform: uppercase;">
                        SECURITY GATE
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Body Content -->
            <tr>
              <td class="email-body-padding" style="padding: 36px 32px; background-color: #ffffff;">
                
                <!-- Tagline Badge -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                  <tr>
                    <td>
                      <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 0.15em; color: #0d9488; text-transform: uppercase;">
                        CONSOLE GATE &bull; OTP VERIFICATION
                      </span>
                    </td>
                  </tr>
                </table>

                <!-- Title with Serif Accent -->
                <h1 class="email-title" style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 26px; font-weight: 900; line-height: 1.25; color: #0f172a; letter-spacing: -0.5px;">
                  User Admin <span style="font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; font-style: italic; font-weight: 400; color: #0d9488;">Access</span>
                </h1>

                <!-- Explanatory Text -->
                <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #475569;">
                  A request was received to unlock administrative privileges for your account. Enter the verification code below in the User Admin verification prompt to authenticate.
                </p>

                <!-- Website-Style Custom Flat Alert Box -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0fdfa; border: 2px solid #0d9488; margin-bottom: 24px;">
                  <tr>
                    <td style="padding: 12px 14px; vertical-align: top; width: 22px;">
                      <span style="font-size: 16px; line-height: 1;">🛡️</span>
                    </td>
                    <td style="padding: 12px 14px 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; line-height: 1.5; color: #0f766e; font-weight: 500;">
                      Confirm this code within <strong>{expires_minutes} minutes</strong> to establish your administrative session.
                    </td>
                  </tr>
                </table>

                <!-- Brutalist OTP Presentation Box -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 2px solid #0f172a; box-shadow: 4px 4px 0px #0f172a; margin-bottom: 28px;">
                  <tr>
                    <td align="center" style="padding: 24px 16px;">
                      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 2px; color: #64748b; text-transform: uppercase; margin-bottom: 10px;">
                        ONE-TIME PASSCODE
                      </div>
                      
                      <!-- OTP Digits -->
                      <div class="otp-digits" style="font-family: 'JetBrains Mono', 'SF Mono', Consolas, Monaco, monospace; font-size: 38px; font-weight: 900; letter-spacing: 12px; color: #0f172a; padding-left: 12px; margin: 6px 0 14px 0; line-height: 1;">
                        {otp}
                      </div>

                      <!-- Expiration Pill Badge -->
                      <div>
                        <span style="display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px;">
                          ⏱ Valid for {expires_minutes} minutes
                        </span>
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- Security Checklist Card -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border: 1px solid #cbd5e1; margin-bottom: 10px;">
                  <tr>
                    <td style="padding: 16px 18px;">
                      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; color: #0f172a; text-transform: uppercase; margin-bottom: 10px;">
                        SECURITY GUIDELINES
                      </div>
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="vertical-align: top; width: 18px; padding-bottom: 8px; font-size: 13px; color: #0d9488; font-weight: bold;">
                            ✓
                          </td>
                          <td style="padding-bottom: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; line-height: 1.5; color: #475569;">
                            <strong>Single session:</strong> Valid for a single verification attempt within this browser.
                          </td>
                        </tr>
                        <tr>
                          <td style="vertical-align: top; width: 18px; padding-bottom: 8px; font-size: 13px; color: #0d9488; font-weight: bold;">
                            ✓
                          </td>
                          <td style="padding-bottom: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; line-height: 1.5; color: #475569;">
                            <strong>Confidential:</strong> Never share this code with anyone. Mindstores will never ask for it.
                          </td>
                        </tr>
                        <tr>
                          <td style="vertical-align: top; width: 18px; font-size: 13px; color: #0d9488; font-weight: bold;">
                            ✓
                          </td>
                          <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; line-height: 1.5; color: #475569;">
                            <strong>Unsolicited request?</strong> If you did not initiate this request, your account credentials remain safe.
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>

            <!-- Footer Section -->
            <tr>
              <td class="email-footer-padding" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 28px; text-align: center;">
                <p style="margin: 0 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 600; color: #64748b;">
                  Mindstores Automated Security Gateway
                </p>
                <p style="margin: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #94a3b8;">
                  Delivered securely to <span style="color: #475569; font-weight: 500;">{to_email}</span>
                </p>
                <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #94a3b8;">
                  &copy; Mindstores. All rights reserved. &bull; Please do not reply directly to this automated email.
                </p>
              </td>
            </tr>

          </table>
          <!-- End Main Frame Table -->
        </td>
      </tr>
    </table>
  </body>
</html>"""

    if smtp_host:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = header_from
            msg["To"] = to_email
            msg.attach(MIMEText(plain_text, "plain", "utf-8"))
            msg.attach(MIMEText(html_content, "html", "utf-8"))

            if smtp_ssl:
                with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=12) as server:
                    if smtp_user and smtp_password:
                        server.login(smtp_user, smtp_password)
                    server.sendmail(envelope_from, [to_email], msg.as_string())
            else:
                with smtplib.SMTP(smtp_host, smtp_port, timeout=12) as server:
                    if smtp_tls:
                        server.starttls()
                    if smtp_user and smtp_password:
                        server.login(smtp_user, smtp_password)
                    server.sendmail(envelope_from, [to_email], msg.as_string())

            logger.info("Sent User Admin OTP email to %s via SMTP %s", to_email, smtp_host)
            print(f"[SMTP SUCCESS] Dispatched OTP code to {to_email} via {smtp_host}", flush=True)
            return True, "Email sent successfully"
        except smtplib.SMTPAuthenticationError as exc:
            err_msg = f"SMTP Authentication failed: {exc.smtp_error.decode('utf-8', errors='replace') if hasattr(exc, 'smtp_error') else str(exc)}"
            logger.error("Failed to send OTP to %s: %s", to_email, err_msg)
            print(f"[SMTP AUTH ERROR] {err_msg}", flush=True)
            return False, "Email server authentication failed. Please check your SMTP username and App Password."
        except Exception as exc:
            err_msg = str(exc)
            logger.error("Failed to send OTP email to %s via SMTP (%s): %s", to_email, smtp_host, err_msg)
            print(f"[SMTP ERROR] Failed to send email to {to_email}: {err_msg}", flush=True)
            return False, f"Failed to send email: {err_msg}"

    # Fallback when SMTP is not configured
    print(f"\n=======================================================\n[USER ADMIN OTP SERVICE - DEV MODE]\nEmail: {to_email}\nOTP Code: {otp}\nExpires In: {expires_minutes} minutes\n=======================================================\n", flush=True)
    logger.info("[DEV] User Admin OTP for %s: %s", to_email, otp)
    return True, "Dev mode fallback"
