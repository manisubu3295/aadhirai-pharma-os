import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { BookOpen, Lightbulb, AlertTriangle, HelpCircle, ImageOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigation, groupMenusBySection } from "@/contexts/NavigationContext";
import { userGuideContent } from "@/lib/userGuideContent";
import { userGuideFaq } from "@/lib/userGuideFaq";

function RevealOnScroll({ id, children }: { id: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      id={id}
      ref={ref}
      className={`scroll-mt-24 transition-all duration-500 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {children}
    </div>
  );
}

export default function UserGuide() {
  const { menus, isLoading } = useNavigation();
  // Exclude the guide's own entry — nothing useful to say about itself.
  const guideMenus = useMemo(() => menus.filter((m) => m.key !== "help.guide"), [menus]);
  const sections = useMemo(() => groupMenusBySection(guideMenus), [guideMenus]);

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);

  // Scrollspy: highlight whichever section card is currently most visible.
  useEffect(() => {
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
          setActiveKey(topMost.target.id);
        }
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 },
    );
    sections.forEach((section) => {
      section.items.forEach((menu) => {
        const el = document.getElementById(`guide-${menu.key}`);
        if (el) observer.observe(el);
      });
    });
    return () => observer.disconnect();
  }, [sections]);

  const jumpTo = (key: string) => {
    document.getElementById(`guide-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
              A complete walkthrough of every feature you currently have access to — how to use it, mistakes to avoid, and answers to
              common questions. What you see here matches your sidebar exactly.
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
          <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
            {/* Table of contents — sticky, jump-to-topic navigation */}
            <nav className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
              <div className="space-y-4">
                {sections.map((section) => (
                  <div key={section.section}>
                    <p className="text-xs font-semibold text-muted-foreground tracking-wide mb-1 px-2">{section.section}</p>
                    <ul className="space-y-0.5">
                      {section.items.map((menu) => {
                        const entry = userGuideContent[menu.key];
                        if (!entry) return null;
                        const isActive = activeKey === `guide-${menu.key}`;
                        return (
                          <li key={menu.id}>
                            <button
                              type="button"
                              onClick={() => jumpTo(menu.key)}
                              data-testid={`guide-toc-${menu.key}`}
                              className={`w-full text-left text-sm rounded-md px-2 py-1.5 transition-colors ${
                                isActive
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              }`}
                            >
                              {entry.title}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
                <div>
                  <button
                    type="button"
                    onClick={() => document.getElementById("guide-faq")?.scrollIntoView({ behavior: "smooth" })}
                    className="w-full text-left text-sm rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center gap-1.5"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    FAQ
                  </button>
                </div>
              </div>
            </nav>

            {/* Main content */}
            <div className="space-y-6 min-w-0">
              {sections.map((section) => (
                <div key={section.section} className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground tracking-wide">{section.section}</h2>
                  <div className="space-y-4">
                    {section.items.map((menu) => {
                      const entry = userGuideContent[menu.key];
                      if (!entry) return null;
                      return (
                        <RevealOnScroll key={menu.id} id={`guide-${menu.key}`}>
                          <Card data-testid={`guide-card-${menu.key}`}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base">{entry.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <p className="text-sm text-muted-foreground">{entry.description}</p>

                              {entry.screenshot ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setZoomedImage({ src: entry.screenshot!, alt: entry.screenshotAlt || entry.title })
                                  }
                                  className="block w-full rounded-lg border overflow-hidden hover:opacity-90 transition-opacity"
                                >
                                  <img src={entry.screenshot} alt={entry.screenshotAlt || entry.title} className="w-full" />
                                </button>
                              ) : (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                                  <ImageOff className="h-3.5 w-3.5 shrink-0" />
                                  <span>Screenshot coming soon for this screen.</span>
                                </div>
                              )}

                              {entry.steps && entry.steps.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-foreground mb-1.5">How to use it</p>
                                  <ol className="space-y-1.5">
                                    {entry.steps.map((step, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <span className="shrink-0 mt-0.5 h-4 w-4 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center">
                                          {i + 1}
                                        </span>
                                        <span>{step}</span>
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              )}

                              {entry.mistakes && entry.mistakes.length > 0 && (
                                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
                                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 mb-1.5 flex items-center gap-1.5">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Common mistakes
                                  </p>
                                  <ul className="space-y-1">
                                    {entry.mistakes.map((mistake, i) => (
                                      <li key={i} className="text-xs text-amber-800/90 dark:text-amber-400/90">
                                        {mistake}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

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
                        </RevealOnScroll>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* FAQ */}
              <RevealOnScroll id="guide-faq">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <HelpCircle className="h-5 w-5" />
                      Frequently Asked Questions
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Doubts pharmacy owners actually run into, answered.</p>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible>
                      {userGuideFaq.map((faq, i) => (
                        <AccordionItem key={i} value={`faq-${i}`}>
                          <AccordionTrigger className="text-sm">{faq.question}</AccordionTrigger>
                          <AccordionContent className="text-sm text-muted-foreground">{faq.answer}</AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </RevealOnScroll>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!zoomedImage} onOpenChange={(open) => !open && setZoomedImage(null)}>
        <DialogContent className="max-w-4xl">
          {zoomedImage && <img src={zoomedImage.src} alt={zoomedImage.alt} className="w-full rounded-md" />}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
