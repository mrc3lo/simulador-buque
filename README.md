# Simulador colaborativo de buque

Aplicación educativa en React/Next.js para experimentar con flotabilidad, estabilidad y distribución de carga. El profesor crea una sala, comparte un código y los alumnos ingresan con su nombre desde cualquier dispositivo.

## Qué incluye

- Vista independiente para profesor y alumnos.
- Cantidad variable de estudiantes, sin el límite original de cinco.
- Sala identificada por código de seis caracteres.
- PIN para recuperar el control docente desde otro computador.
- Carga por babor o estribor, con masa y posición longitudinal configurables.
- Cálculo de desplazamiento, calado, KG, KB, BM, KM, GM, momento escorante y escora.
- Visualización 3D interactiva con p5.js.
- Lista de participantes activos y bitácora de acciones.
- Sesión, preferencias y último estado guardados en `localStorage`.
- Estado compartido almacenado en Supabase.

## Arquitectura

- **Next.js + React + TypeScript:** interfaz y rutas privadas del servidor.
- **Supabase Postgres:** salas, participantes, cargas y bitácora.
- **Vercel:** alojamiento de la aplicación y ejecución de las rutas API.
- **p5.js 1.11:** visualización 3D del buque, instalada desde npm para mantener compatibilidad entre navegadores.

El navegador nunca recibe la `service_role` de Supabase. Todas las escrituras pasan por rutas del servidor que validan la sala, el rol y el token del participante.

## 1. Preparar Supabase

1. Crea un proyecto gratuito en [Supabase](https://supabase.com/).
2. Abre **SQL Editor**.
3. Copia y ejecuta el contenido de `supabase/schema.sql`.
4. En **Project Settings > API**, copia:
   - Project URL.
   - `service_role` key. Esta clave es secreta y nunca debe subirse a GitHub.

## 2. Configurar el proyecto local

Requiere Node.js 22 o superior.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Completa `.env.local`:

```env
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
APP_SECRET=una-frase-larga-aleatoria-y-privada
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Abre [http://localhost:3000](http://localhost:3000).

## 3. Publicar en GitHub

```bash
git init
git add .
git commit -m "Primera versión del simulador colaborativo"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/simulador-buque.git
git push -u origin main
```

El archivo `.gitignore` evita que `.env.local` y las claves secretas se suban al repositorio.

## 4. Publicar en Vercel

1. Entra a [Vercel](https://vercel.com/) y selecciona **Add New > Project**.
2. Importa el repositorio de GitHub.
3. Vercel detectará Next.js automáticamente.
4. Agrega las variables `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_SECRET` y `NEXT_PUBLIC_APP_URL`.
5. En `NEXT_PUBLIC_APP_URL`, usa la dirección definitiva entregada por Vercel.
6. Presiona **Deploy**.

## Uso en clases

1. El profesor entra a `/profesor`, crea una sala y guarda su PIN.
2. Comparte el enlace o el código visible en pantalla.
3. Cada estudiante entra a `/alumno`, escribe su nombre y se conecta.
4. El curso agrega cargas y observa cómo cambian los parámetros navales.
5. El profesor puede retirar la última carga, reiniciar el ejercicio o cerrar la sala.

## Consideración física

El modelo conserva las simplificaciones del prototipo: casco prismático rectangular, densidad constante de agua de mar de 1025 kg/m³ y posiciones discretas de carga. Es una herramienta didáctica; no sustituye software de cálculo o certificación naval.
