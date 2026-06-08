import { Router, type Request, type Response, type NextFunction } from "express";
import { query } from "../config/db";
import type { Theme } from "@devfolio/shared";

export const themeRouter = Router();

const PRESET_THEMES = [
  {
    name: "Ocean",
    colors: {
      primary: "#0077B6",
      secondary: "#00B4D8",
      background: "#CAF0F8",
      text: "#03045E",
      accent: "#90E0EF",
    },
    fonts: {
      heading: "Inter",
      body: "Inter",
    },
  },
  {
    name: "Forest",
    colors: {
      primary: "#2D6A4F",
      secondary: "#52B788",
      background: "#D8F3DC",
      text: "#081C15",
      accent: "#95D5B2",
    },
    fonts: {
      heading: "Lora",
      body: "Lora",
    },
  },
  {
    name: "Sunset",
    colors: {
      primary: "#E85D04",
      secondary: "#F48C06",
      background: "#FFEDD5",
      text: "#6B2100",
      accent: "#FAA307",
    },
    fonts: {
      heading: "Playfair Display",
      body: "Source Sans Pro",
    },
  },
  {
    name: "Midnight",
    colors: {
      primary: "#7B2CBF",
      secondary: "#9D4EDD",
      background: "#10002B",
      text: "#E0AAFF",
      accent: "#C77DFF",
    },
    fonts: {
      heading: "Montserrat",
      body: "Open Sans",
    },
  },
  {
    name: "Minimal",
    colors: {
      primary: "#212529",
      secondary: "#495057",
      background: "#F8F9FA",
      text: "#212529",
      accent: "#ADB5BD",
    },
    fonts: {
      heading: "Helvetica",
      body: "Helvetica",
    },
  },
];

export async function seedPresetThemes(): Promise<void> {
  const existing = await query("SELECT COUNT(*) as count FROM themes WHERE is_preset = true");
  if (parseInt(existing.rows[0].count, 10) > 0) {
    return;
  }
  for (const preset of PRESET_THEMES) {
    await query(
      `INSERT INTO themes (name, colors, fonts, is_preset)
       VALUES ($1, $2, $3, true)`,
      [preset.name, JSON.stringify(preset.colors), JSON.stringify(preset.fonts)]
    );
  }
  console.log("Seeded 5 preset themes");
}

function mapTheme(row: any): Theme {
  return {
    id: row.id,
    name: row.name,
    colors: typeof row.colors === "string" ? JSON.parse(row.colors) : row.colors,
    fonts: typeof row.fonts === "string" ? JSON.parse(row.fonts) : row.fonts,
    isPreset: row.is_preset,
    createdAt: row.created_at.toISOString(),
  };
}

themeRouter.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      "SELECT id, name, colors, fonts, is_preset, created_at FROM themes ORDER BY created_at"
    );
    const themes = result.rows.map(mapTheme);
    res.json({ success: true, data: themes });
  } catch (err) {
    next(err);
  }
});

themeRouter.get("/presets", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      "SELECT id, name, colors, fonts, is_preset, created_at FROM themes WHERE is_preset = true ORDER BY created_at"
    );
    const themes = result.rows.map(mapTheme);
    res.json({ success: true, data: themes });
  } catch (err) {
    next(err);
  }
});
