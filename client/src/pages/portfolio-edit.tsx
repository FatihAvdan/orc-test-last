import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { Portfolio, ApiResponse, CreatePortfolioRequest, UpdatePortfolioRequest } from "@/types";
import { PortfolioForm } from "@/components/portfolio/portfolio-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PortfolioEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isCreate = !id;

  useEffect(() => {
    if (isCreate) {
      setLoading(false);
      return;
    }
    api
      .get<ApiResponse<Portfolio>>(`/portfolios/${id}`)
      .then((res) => {
        if (res.success && res.data) {
          setPortfolio(res.data);
        }
      })
      .catch(() => navigate("/dashboard"))
      .finally(() => setLoading(false));
  }, [id, isCreate, navigate]);

  async function handleSubmit(data: CreatePortfolioRequest | UpdatePortfolioRequest) {
    setSaving(true);
    try {
      if (isCreate) {
        const res = await api.post<ApiResponse<Portfolio>>("/portfolios", data);
        if (!res.success || !res.data) {
          throw new Error(res.error || "Failed to create portfolio");
        }
        navigate(`/portfolios/${res.data.id}/edit`);
      } else {
        await api.put<ApiResponse<Portfolio>>(`/portfolios/${id}`, data);
        navigate("/dashboard");
      }
    } catch (err) {
      setSaving(false);
      throw err;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isCreate ? "Create Portfolio" : "Edit Portfolio"}
          </h1>
          <p className="text-muted-foreground">
            {isCreate
              ? "Fill in the details for your new portfolio"
              : `Editing: ${portfolio?.title}`}
          </p>
        </div>
      </div>

      <PortfolioForm
        portfolio={portfolio || undefined}
        onSubmit={handleSubmit}
        loading={saving}
      />
    </div>
  );
}
