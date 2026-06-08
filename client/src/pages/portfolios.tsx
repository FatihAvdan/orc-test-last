import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import type { Portfolio, ApiResponse } from "@/types";
import { PortfolioCard } from "@/components/portfolio/portfolio-card";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function PortfoliosPage() {
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);

  const [showDelete, setShowDelete] = useState<Portfolio | null>(null);
  const [error, setError] = useState("");

  const fetchPortfolios = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<Portfolio[]>>("/portfolios");
      if (res.success && res.data) {
        setPortfolios(res.data);
      }
    } catch {
      setError("Failed to load portfolios");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  async function handleDelete() {
    if (!showDelete) return;
    try {
      await api.delete(`/portfolios/${showDelete.id}`);
      setPortfolios((prev) => prev.filter((p) => p.id !== showDelete.id));
      setShowDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolios</h1>
          <p className="text-muted-foreground">Browse and manage all your portfolios</p>
        </div>
        <Button onClick={() => navigate("/portfolios/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Portfolio
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : portfolios.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-12">
          <FolderOpen className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <p className="text-lg font-medium">No portfolios yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first portfolio to get started
            </p>
          </div>
          <Button onClick={() => navigate("/portfolios/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Portfolio
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portfolios.map((portfolio) => (
            <PortfolioCard
              key={portfolio.id}
              portfolio={portfolio}
              onEdit={(p) => navigate(`/portfolios/${p.id}/edit`)}
              onDelete={(p) => setShowDelete(p)}
              onPreview={(p) => navigate(`/portfolios/${p.id}/edit`)}
            />
          ))}
        </div>
      )}

      <Dialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Portfolio</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &quot;{showDelete?.title}&quot;? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
