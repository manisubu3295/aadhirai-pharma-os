import type { MenuWithPermissions, User } from "@shared/schema";
import { storage } from "../storage";
import { findModuleByRoute, searchModulesByQuestion } from "./assistant-knowledge";

export interface AssistantToolInput {
  question: string;
  route?: string;
  user: User;
  accessibleMenus: MenuWithPermissions[];
}

interface AssistantTool {
  name: string;
  collect(input: AssistantToolInput): Promise<string[]> | string[];
}

class InventoryInsightTool implements AssistantTool {
  name = "inventory-insight";

  async collect(input: AssistantToolInput): Promise<string[]> {
    const normalized = input.question.toLowerCase();
    const needsInventoryData = /(reorder|low stock|below reorder|stock|expiry|expiring|near expiry|out of stock)/.test(normalized);

    if (!needsInventoryData) {
      return [];
    }

    const medicines = await storage.getMedicines();
    if (medicines.length === 0) {
      return ["Live inventory snapshot: no medicines are currently available in the database."];
    }

    const today = new Date();
    const millisPerDay = 1000 * 60 * 60 * 24;
    const daysUntil = (expiryDate: string | null | undefined): number | null => {
      if (!expiryDate) {
        return null;
      }

      const parsed = new Date(expiryDate);
      if (Number.isNaN(parsed.getTime())) {
        return null;
      }

      return Math.ceil((parsed.getTime() - today.getTime()) / millisPerDay);
    };

    const belowReorder = medicines
      .filter((medicine) => Number(medicine.quantity || 0) < Number(medicine.reorderLevel || 0))
      .sort((left, right) => {
        const leftGap = Number(left.reorderLevel || 0) - Number(left.quantity || 0);
        const rightGap = Number(right.reorderLevel || 0) - Number(right.quantity || 0);
        return rightGap - leftGap;
      });

    const expiringSoon = medicines
      .map((medicine) => ({ medicine, daysLeft: daysUntil(medicine.expiryDate) }))
      .filter((entry) => entry.daysLeft !== null && entry.daysLeft <= 90)
      .sort((left, right) => Number(left.daysLeft) - Number(right.daysLeft));

    const hints: string[] = [
      `Live inventory snapshot: ${medicines.length} medicine batches/items loaded. ${belowReorder.length} item(s) are below reorder level. ${expiringSoon.length} item(s) expire within 90 days.`,
    ];

    if (belowReorder.length > 0) {
      hints.push(
        `Below reorder items: ${belowReorder
          .slice(0, 8)
          .map((medicine) => `${medicine.name} batch ${medicine.batchNumber} qty ${medicine.quantity} reorder ${medicine.reorderLevel}`)
          .join("; ")}`,
      );
    }

    if (expiringSoon.length > 0) {
      hints.push(
        `Expiring soon items: ${expiringSoon
          .slice(0, 6)
          .map(({ medicine, daysLeft }) => `${medicine.name} batch ${medicine.batchNumber} expires in ${daysLeft} day(s) with qty ${medicine.quantity}`)
          .join("; ")}`,
      );
    }

    return hints;
  }
}

class NavigationHintTool implements AssistantTool {
  name = "navigation-hint";

  collect(input: AssistantToolInput): string[] {
    const normalized = input.question.toLowerCase();
    const isNavigationIntent = /(where|open|go to|navigate|menu|screen|module)/.test(normalized);
    if (!isNavigationIntent) {
      return [];
    }

    const matchedMenus = input.accessibleMenus
      .filter((menu) => menu.canView)
      .filter((menu) => {
        const label = menu.label.toLowerCase();
        const route = menu.routePath.toLowerCase();
        return normalized.includes(label) || normalized.includes(route.replace(/^\//, ""));
      })
      .slice(0, 3)
      .map((menu) => `Accessible route: ${menu.label} at ${menu.routePath}`);

    if (matchedMenus.length > 0) {
      return matchedMenus;
    }

    return input.accessibleMenus
      .filter((menu) => menu.canView)
      .slice(0, 3)
      .map((menu) => `Common accessible route for this user: ${menu.label} at ${menu.routePath}`);
  }
}

class CurrentModuleTool implements AssistantTool {
  name = "current-module";

  collect(input: AssistantToolInput): string[] {
    const moduleInfo = findModuleByRoute(input.route);
    if (!moduleInfo) {
      return [];
    }

    return [
      `Current module: ${moduleInfo.title}`,
      `Module purpose: ${moduleInfo.summary}`,
      `Common tasks here: ${moduleInfo.commonTasks.join(", ")}`,
    ];
  }
}

class RelatedModuleTool implements AssistantTool {
  name = "related-modules";

  collect(input: AssistantToolInput): string[] {
    const related = searchModulesByQuestion(input.question)
      .filter((moduleInfo) => input.accessibleMenus.some((menu) => menu.routePath === moduleInfo.route && menu.canView))
      .slice(0, 3);

    return related.map((moduleInfo) => `${moduleInfo.title} is relevant at ${moduleInfo.route}: ${moduleInfo.summary}`);
  }
}

export class AssistantToolRegistry {
  private readonly tools: AssistantTool[] = [
    new InventoryInsightTool(),
    new NavigationHintTool(),
    new CurrentModuleTool(),
    new RelatedModuleTool(),
  ];

  async collectHints(input: AssistantToolInput): Promise<string[]> {
    const collected = await Promise.all(this.tools.map((tool) => tool.collect(input)));
    return collected.flat().filter(Boolean).slice(0, 12);
  }
}