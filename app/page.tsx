import Link from "next/link";
import {
  ArrowRight,
  GraduationCap,
  Radio,
  ShieldCheck,
  UserRound,
  Waves,
} from "lucide-react";

export default function Home() {
  return (
    <main className="home-page">
      <div className="home-grid" aria-hidden="true" />
      <header className="home-header">
        <div className="brand-lockup light">
          <span className="brand-mark"><span /></span>
          <div><span className="eyebrow">Laboratorio naval</span><strong>Simulador de Buque</strong></div>
        </div>
        <span className="home-status"><Radio /> Aula colaborativa</span>
      </header>

      <section className="home-content">
        <div className="home-intro">
          <span className="home-kicker"><Waves /> Flotabilidad y estabilidad</span>
          <h1>Aprender viendo cómo responde el buque.</h1>
          <p>
            Una experiencia de aula donde cada carga modifica el calado, el centro de gravedad y la escora para todo el curso.
          </p>
        </div>

        <div className="role-grid" aria-label="Selecciona tu perfil">
          <Link href="/profesor" className="role-card teacher">
            <span className="role-icon"><GraduationCap /></span>
            <span className="eyebrow">Docente</span>
            <h2>Crear o recuperar una sala</h2>
            <p>Inicia un ejercicio, comparte el código y observa el trabajo del curso.</p>
            <strong>Entrar como profesor <ArrowRight /></strong>
          </Link>
          <Link href="/alumno" className="role-card student">
            <span className="role-icon"><UserRound /></span>
            <span className="eyebrow">Estudiante</span>
            <h2>Unirse a una clase</h2>
            <p>Identifícate, agrega carga y analiza el efecto junto a tus compañeros.</p>
            <strong>Entrar como alumno <ArrowRight /></strong>
          </Link>
        </div>
      </section>

      <footer className="home-footer">
        <span><ShieldCheck /> Tu identidad de aula queda guardada en este dispositivo.</span>
        <span>Diseñado para clases de estabilidad naval</span>
      </footer>
    </main>
  );
}
