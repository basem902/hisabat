import { Font } from "@react-pdf/renderer";
import path from "path";

const REGULAR = path.join(process.cwd(), "lib/pdf/fonts/Cairo-Regular.ttf");
const BOLD = path.join(process.cwd(), "lib/pdf/fonts/Cairo-Bold.ttf");

/**
 * Register the Cairo font under a given family name (idempotent per family).
 *
 * Each PDF template MUST use its OWN unique family name. react-pdf keeps a
 * single shared, lazily-loaded font object per family; when multiple templates
 * share one family ("Cairo") and are rendered in the same process, that shared
 * object gets into a bad state and all but one template fail to render ("Cannot
 * read properties of undefined (reading 'id')"). Distinct family names give
 * each template an isolated font object, so every report type renders reliably.
 */
export function ensureFont(family: string) {
  if (Font.getRegisteredFontFamilies().includes(family)) return;
  Font.register({
    family,
    fonts: [{ src: REGULAR }, { src: BOLD, fontWeight: 700 }],
  });
}
