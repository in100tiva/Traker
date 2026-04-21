// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Heatmap } from "@/components/Heatmap";
import { todayKey, toDateKey } from "@/lib/date";
import { addDays } from "date-fns";

describe("Heatmap", () => {
  it("renders 53 weeks × 7 days of cells", () => {
    render(<Heatmap entries={[]} color="#22c55e" />);
    const grid = screen.getByTestId("heatmap-grid");
    expect(grid.children.length).toBe(53 * 7);
  });

  it("today cell exposes aria-label with count", () => {
    const today = todayKey();
    render(<Heatmap entries={[{ date: today, count: 3 }]} color="#22c55e" />);
    expect(
      screen.getByLabelText(new RegExp(`^${today} contagem 3`)),
    ).toBeInTheDocument();
  });

  it("note indicator adds '(com nota)' to the label", () => {
    const today = todayKey();
    render(
      <Heatmap
        entries={[{ date: today, count: 1, note: "algo" }]}
        color="#22c55e"
      />,
    );
    expect(
      screen.getByLabelText(new RegExp(`${today}.*com nota`)),
    ).toBeInTheDocument();
  });

  it("calls onCellClick when provided (takes priority over onToggle)", () => {
    const onToggle = vi.fn();
    const onCellClick = vi.fn();
    const today = todayKey();
    render(
      <Heatmap
        entries={[]}
        color="#22c55e"
        onToggle={onToggle}
        onCellClick={onCellClick}
      />,
    );
    const btn = screen.getByLabelText(new RegExp(`^${today} não feito`));
    fireEvent.click(btn);
    expect(onCellClick).toHaveBeenCalledTimes(1);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("retroactive limit disables cells older than the threshold", () => {
    const onCellClick = vi.fn();
    render(
      <Heatmap
        entries={[]}
        color="#22c55e"
        retroactiveLimitDays={7}
        onCellClick={onCellClick}
      />,
    );
    // 30 days ago is older than the 7-day threshold → disabled (cannot click)
    const tooOld = toDateKey(addDays(new Date(), -30));
    const btn = screen.queryByLabelText(new RegExp(`^${tooOld} não feito`));
    if (btn) {
      fireEvent.click(btn);
      expect(onCellClick).not.toHaveBeenCalled();
    }
    // Yesterday is within the window → clickable
    const yesterday = toDateKey(addDays(new Date(), -1));
    const okBtn = screen.getByLabelText(new RegExp(`^${yesterday} não feito`));
    fireEvent.click(okBtn);
    expect(onCellClick).toHaveBeenCalledTimes(1);
  });

  it("month nav buttons are present and clickable", () => {
    render(<Heatmap entries={[]} color="#22c55e" />);
    const prev = screen.getByTestId("heatmap-prev-month");
    const next = screen.getByTestId("heatmap-next-month");
    fireEvent.click(prev);
    fireEvent.click(next);
    // Smoke test — no errors
    expect(prev).toBeInTheDocument();
    expect(next).toBeInTheDocument();
  });
});
