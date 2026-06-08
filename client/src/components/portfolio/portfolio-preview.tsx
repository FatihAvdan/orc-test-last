import type { Portfolio, Theme } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface PortfolioPreviewProps {
  portfolio: Portfolio;
  theme?: Theme | null;
}

export function PortfolioPreview({ portfolio, theme }: PortfolioPreviewProps) {
  const colors = theme?.colors;
  const fonts = theme?.fonts;

  const containerStyle: React.CSSProperties = colors
    ? {
        backgroundColor: colors.background,
        color: colors.text,
      }
    : {};

  const headingStyle: React.CSSProperties = {};
  if (fonts?.heading) {
    headingStyle.fontFamily = fonts.heading;
  }
  if (colors?.primary) {
    headingStyle.color = colors.primary;
  }

  const accentStyle: React.CSSProperties = colors
    ? { color: colors.accent }
    : {};

  return (
    <Card style={containerStyle}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold"
            style={{
              backgroundColor: colors?.primary || "#000",
              color: "#fff",
            }}
          >
            {portfolio.title.charAt(0).toUpperCase()}
          </div>
          <div>
            <CardTitle style={headingStyle}>{portfolio.title}</CardTitle>
            <CardDescription style={accentStyle}>
              {portfolio.template} template
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p style={fonts?.body ? { fontFamily: fonts.body } : {}}>
          {portfolio.description || "Your portfolio description will appear here. Add details about your projects, skills, and experience."}
        </p>

        {theme && (
          <div className="mt-6 space-y-2">
            <div className="flex gap-2">
              {["primary", "secondary", "background", "text", "accent"].map(
                (key) => (
                  <div key={key} className="flex flex-col items-center gap-1">
                    <div
                      className="h-6 w-6 rounded-full border"
                      style={{
                        backgroundColor:
                          colors?.[key as keyof typeof colors],
                      }}
                      title={key}
                    />
                    <span className="text-[10px] capitalize" style={accentStyle}>
                      {key}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
