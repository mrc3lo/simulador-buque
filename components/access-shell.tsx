import Link from "next/link";
import { Anchor, ArrowLeft } from "lucide-react";

export function AccessShell({
  role,
  title,
  description,
  children,
}: {
  role: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="access-page">
      <div className="access-backdrop" aria-hidden="true"><span /><span /><span /></div>
      <section className="access-panel">
        <Link href="/" className="back-link"><ArrowLeft /> Inicio</Link>
        <div className="access-brand"><Anchor /><span>Laboratorio Logística Marítima y Portuaria</span></div>
        <span className="eyebrow">{role}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        {children}
      </section>
    </main>
  );
}
