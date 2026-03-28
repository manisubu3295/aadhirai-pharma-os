import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { useAssistant } from "@/hooks/use-assistant";
import { AssistantLauncher } from "./AssistantLauncher";
import { AssistantPanel } from "./AssistantPanel";

export function AssistantRoot() {
  const { user } = useAuth();
  const { isOpen, setOpen } = useAssistant();

  if (!user) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <AssistantLauncher onOpen={() => setOpen(true)} hidden={isOpen} />
      <SheetContent
        side="right"
        className="flex w-full max-w-[480px] flex-col overflow-hidden border-l border-slate-200 p-0 sm:max-w-[480px]"
      >
        <AssistantPanel />
      </SheetContent>
    </Sheet>
  );
}
