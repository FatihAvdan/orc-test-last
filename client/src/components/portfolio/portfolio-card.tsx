import type { Portfolio } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Eye } from "lucide-react";

interface PortfolioCardProps {
  portfolio: Portfolio;
  onEdit: (portfolio: Portfolio) => void;
  onDelete: (portfolio: Portfolio) => void;
  onPreview: (portfolio: Portfolio) => void;
}

export function PortfolioCard({ portfolio, onEdit, onDelete, onPreview }: PortfolioCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">{portfolio.title}</CardTitle>
        <CardDescription>
          {portfolio.description || "No description"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
            {portfolio.template}
          </span>
          {portfolio.published ? (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">
              Published
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              Draft
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" size="sm" onClick={() => onPreview(portfolio)}>
          <Eye className="mr-1 h-3 w-3" />
          Preview
        </Button>
        <Button variant="outline" size="sm" onClick={() => onEdit(portfolio)}>
          <Pencil className="mr-1 h-3 w-3" />
          Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={() => onDelete(portfolio)}>
          <Trash2 className="mr-1 h-3 w-3" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
