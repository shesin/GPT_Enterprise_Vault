/**
 * Sends the login link. Production sends through SMTP (the password only ever comes from the
 * server's environment); development without SMTP settings prints the link in the server console.
 * Environment: SMTP_HOST, SMTP_PORT (default 465), SMTP_USER, SMTP_PASS, SMTP_FROM (default SMTP_USER).
 */
import nodemailer from 'nodemailer';

export interface Mailer {
  /** `code` is the 6-digit code typed in the app (the link opens in the browser, not in the Android app). */
  sendLoginLink(to: string, link: string, code?: string): Promise<void>;
}

export class ConsoleMailer implements Mailer {
  async sendLoginLink(to: string, link: string, code?: string): Promise<void> {
    console.log(`[mail] login link for ${to}: ${link}${code ? ` code: ${code}` : ''}`);
  }
}

export class SmtpMailer implements Mailer {
  private readonly transport;
  constructor(
    host: string,
    port: number,
    user: string,
    pass: string,
    private readonly from: string,
  ) {
    this.transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  async sendLoginLink(to: string, link: string, code?: string): Promise<void> {
    await this.transport.sendMail({
      from: `Smart Bead Chess <${this.from}>`,
      to,
      subject: 'Your Smart Bead Chess sign-in link',
      text:
        (code
          ? `Your Smart Bead Chess sign-in code: ${code}\nType it in the app. It works once and expires in 15 minutes.\n\nOr open this link in a browser instead:\n`
          : `Open this link to sign in to Smart Bead Chess. It works once and expires in 15 minutes.\n\n`) +
        `${link}\n\nIf you did not ask for it, ignore this e-mail. Replies go to ${this.from}.`,
    });
  }
}

/** The mailer the environment asks for; undefined when production has no SMTP settings. */
export function mailerFromEnv(env: NodeJS.ProcessEnv): Mailer | undefined {
  const host = env.SMTP_HOST;
  if (host) {
    const user = env.SMTP_USER ?? '';
    return new SmtpMailer(
      host,
      Number(env.SMTP_PORT ?? 465),
      user,
      env.SMTP_PASS ?? '',
      env.SMTP_FROM ?? user,
    );
  }
  return env.NODE_ENV === 'production' ? undefined : new ConsoleMailer();
}
