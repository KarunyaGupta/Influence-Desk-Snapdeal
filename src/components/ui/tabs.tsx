"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({
  tabs,
  activeTab,
  onTabChange,
  children,
  className,
}: TabsProps) {
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    const enabledTabs = tabs
      .map((t, i) => ({ ...t, index: i }))
      .filter((t) => !t.disabled);
    const currentEnabledIndex = enabledTabs.findIndex(
      (t) => t.index === index,
    );

    let nextIndex: number | null = null;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next =
        enabledTabs[(currentEnabledIndex + 1) % enabledTabs.length];
      nextIndex = next.index;
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const next =
        enabledTabs[
          (currentEnabledIndex - 1 + enabledTabs.length) % enabledTabs.length
        ];
      nextIndex = next.index;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIndex = enabledTabs[0].index;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIndex = enabledTabs[enabledTabs.length - 1].index;
    }

    if (nextIndex !== null) {
      tabRefs.current[nextIndex]?.focus();
      onTabChange(tabs[nextIndex].id);
    }
  }

  return (
    <div className={className}>
      <div
        role="tablist"
        className="flex border-b border-border"
        aria-orientation="horizontal"
      >
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={cn(
              "relative min-h-[44px] px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              activeTab === tab.id
                ? "text-primary after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`tabpanel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={activeTab !== tab.id}
          tabIndex={0}
          className="pt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {activeTab === tab.id && children}
        </div>
      ))}
    </div>
  );
}

/**
 * Use TabsContent to conditionally render content per tab:
 * <Tabs ...>
 *   <TabsContent tabId="a" activeTab={active}>Content A</TabsContent>
 *   <TabsContent tabId="b" activeTab={active}>Content B</TabsContent>
 * </Tabs>
 *
 * Or just switch on activeTab in the children render.
 */
export interface TabsContentProps {
  tabId: string;
  activeTab: string;
  children: React.ReactNode;
}

export function TabsContent({ tabId, activeTab, children }: TabsContentProps) {
  if (tabId !== activeTab) return null;
  return <>{children}</>;
}
