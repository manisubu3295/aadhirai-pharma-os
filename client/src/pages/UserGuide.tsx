import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Lightbulb } from "lucide-react";
import { useNavigation, groupMenusBySection } from "@/contexts/NavigationContext";
import { userGuideContent } from "@/lib/userGuideContent";

export default function UserGuide() {
  const { menus, isLoading } = useNavigation();
  // Exclude the guide's own entry — nothing useful to say about itself.
  const sections = groupMenusBySection(menus.filter((m) => m.key !== "help.guide"));

  return (
    <AppLayout title="User Guide">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              User Guide
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              A quick explanation of every feature you currently have access to. What you see here matches your sidebar exactly.
            </p>
          </CardHeader>
        </Card>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading your menu access...</div>
        ) : sections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No menus are currently assigned to your account. Contact your administrator.
          </div>
        ) : (
          sections.map((section) => (
            <div key={section.section} className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground tracking-wide">{section.section}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {section.items.map((menu) => {
                  const entry = userGuideContent[menu.key];
                  if (!entry) return null;
                  return (
                    <Card key={menu.id} data-testid={`guide-card-${menu.key}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{entry.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm text-muted-foreground">{entry.description}</p>
                        {entry.tips && entry.tips.length > 0 && (
                          <ul className="space-y-1">
                            {entry.tips.map((tip, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </AppLayout>
  );
}
