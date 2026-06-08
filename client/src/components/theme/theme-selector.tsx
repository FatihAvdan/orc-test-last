import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { Theme, ApiResponse } from "@/types";
import { cn } from "@/lib/utils";

interface ThemeSelectorProps {
  onSelect: (theme: Theme | null) => void;
  selected: Theme | null;
}

export function ThemeSelector({ onSelect, selected }: ThemeSelectorProps) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ApiResponse<Theme[]>>("/themes/presets")
      .then((res) => {
        if (res.success && res.data) {
          setThemes(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading themes...</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={cn(
          "rounded-md border px-3 py-1.5 text-sm transition-colors",
          !selected
            ? "border-primary bg-primary text-primary-foreground"
            : "hover:bg-accent"
        )}
        onClick={() => onSelect(null)}
      >
        None
      </button>
      {themes.map((theme) => (
        <button
          key={theme.id}
          type="button"
          className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors",
            selected?.id === theme.id
              ? "border-primary bg-primary text-primary-foreground"
              : "hover:bg-accent"
          )}
          onClick={() => onSelect(theme)}
        >
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: theme.colors.primary }}
          />
          {theme.name}
        </button>
      ))}
    </div>
  );
}
