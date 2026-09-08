import { Resend } from "resend";

type ContactRequest = { name: string; email: string; message: string };
type ContactResponse = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: ContactResponse, status: number) {
  return Response.json(body, { status });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<ContactRequest> | null;

  const name = body?.name?.trim();
  const email = body?.email?.trim();
  const message = body?.message?.trim();

  if (!name || !email || !message) {
    return json({ ok: false, error: "missing_fields" }, 400);
  }

  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, error: "invalid_email" }, 400);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;

  if (!apiKey || !to) {
    return json({ ok: false, error: "send_failed" }, 500);
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to,
      replyTo: email,
      subject: `Nuevo mensaje de ${name} — Arcade Vault`,
      text: `De: ${name} <${email}>\n\n${message}`,
    });

    if (error) {
      return json({ ok: false, error: "send_failed" }, 500);
    }

    return json({ ok: true }, 200);
  } catch {
    return json({ ok: false, error: "send_failed" }, 500);
  }
}
