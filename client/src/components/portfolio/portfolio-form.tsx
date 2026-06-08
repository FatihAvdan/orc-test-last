import { useState, type FormEvent } from "react";
import type { Portfolio, CreatePortfolioRequest, UpdatePortfolioRequest, Theme } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeSelector } from "@/components/theme/theme-selector";
import { PortfolioPreview } from "@/components/portfolio/portfolio-preview";
import { Switch } from "@/components/ui/switch";

const TEMPLATES = [
  { value: "default", label: "Default" },
  { value: "minimal", label: "Minimal" },
  { value: "creative", label: "Creative" },
  { value: "professional", label: "Professional" },
];

interface PortfolioFormProps {
  portfolio?: Portfolio;
  onSubmit: (data: CreatePortfolioRequest | UpdatePortfolioRequest) => Promise<void>;
  loading?: boolean;
}

export function PortfolioForm({ portfolio, onSubmit, loading }: PortfolioFormProps) {
  const [title, setTitle] = useState(portfolio?.title || "");
  const [description, setDescription] = useState(portfolio?.description || "");
  const [template, setTemplate] = useState(portfolio?.template || "default");
  const [published, setPublished] = useState(portfolio?.published || false);
  const [error, setError] = useState("");

  const [previewTheme, setPreviewTheme] = useState<Theme | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await onSubmit({ title, description, template, published });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  const previewData: Portfolio = {
    id: portfolio?.id || "preview",
    userId: portfolio?.userId || "",
    title: title || "Untitled",
    description,
    template,
    published,
    createdAt: portfolio?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Portfolio"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short description of your portfolio"
            rows={4}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="template">Template</Label>
          <select
            id="template"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {TEMPLATES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="published"
            checked={published}
            onCheckedChange={setPublished}
          />
          <Label htmlFor="published">Published</Label>
        </div>

        <div className="space-y-2">
          <Label>Theme Preview</Label>
          <ThemeSelector onSelect={setPreviewTheme} selected={previewTheme} />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : portfolio ? "Update Portfolio" : "Create Portfolio"}
          </Button>
        </div>
      </form>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <h3 className="mb-4 text-lg font-semibold">Live Preview</h3>
        <PortfolioPreview portfolio={previewData} theme={previewTheme} />
      </div>
    </div>
  );
}
