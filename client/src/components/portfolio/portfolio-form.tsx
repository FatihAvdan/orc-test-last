import { useState, type FormEvent } from "react";
import type { Portfolio, CreatePortfolioRequest, UpdatePortfolioRequest, Theme } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeSelector } from "@/components/theme/theme-selector";
import { PortfolioPreview } from "@/components/portfolio/portfolio-preview";

interface PortfolioFormProps {
  portfolio?: Portfolio;
  onSubmit: (data: CreatePortfolioRequest | UpdatePortfolioRequest) => Promise<void>;
  loading?: boolean;
}

export function PortfolioForm({ portfolio, onSubmit, loading }: PortfolioFormProps) {
  const [title, setTitle] = useState(portfolio?.title || "");
  const [description, setDescription] = useState(portfolio?.description || "");
  const [template, setTemplate] = useState(portfolio?.template || "default");
  const [error, setError] = useState("");

  const [previewTheme, setPreviewTheme] = useState<Theme | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await onSubmit({ title, description, template });
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
    published: portfolio?.published || false,
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
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short description of your portfolio"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="template">Template</Label>
          <Input
            id="template"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            placeholder="default"
          />
        </div>

        <div className="space-y-2">
          <Label>Theme Preview</Label>
          <ThemeSelector onSelect={setPreviewTheme} selected={previewTheme} />
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : portfolio ? "Update Portfolio" : "Create Portfolio"}
        </Button>
      </form>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <h3 className="mb-4 text-lg font-semibold">Live Preview</h3>
        <PortfolioPreview portfolio={previewData} theme={previewTheme} />
      </div>
    </div>
  );
}
