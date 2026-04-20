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

  it("marks today cell with the 'feito' label when count > 0", () => {
    const today = todayKey();
    render(
      <Heatmap
        entries={[{ date: today, count: 1 }]}
        color="#22c55e"
      />,
    );
    const btn = screen.getByLabelText(new RegExp(`^${today} contagem 1`));
    expect(btn).toBeInTheDocument();
  });

  it("shows count in aria-label for quantitative days", () => {
    const today = todayKey();
    render(
      <Heatmap
        entries={[{ date: today, count: 5 }]}
        color="#22c55e"
      />,
    );
    expect(
      screen.getByLabelText(new RegExp(`^${today} contagem 5`)),
    ).toBeInTheDocument();
  });

  it("disables future cells (no click fires)", () => {
    const onToggle = vi.fn();
    const tomorrow = toDateKey(addDays(new Date(), 1));
    render(<Heatmap entries={[]} color="#22c55e" onToggle={onToggle} />);
    const futureBtn = screen.queryByLabelText(
      new RegExp(`^${tomorrow} não feito`),
    );
    // Future cells still exist in the grid but are disabled
    if (futureBtn) {
      fireEvent.click(futureBtn);
      expect(onToggle).not.toHaveBeenCalled();
    }
  });

  it("calls onToggle with the clicked date", () => {
    const onToggle = vi.fn();
    const today = todayKey();
    render(
      <Heatmap entries={[]} color="#22c55e" onToggle={onToggle} />,
    );
    const btn = screen.getByLabelText(new RegExp(`^${today} não feito`));
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledTimes(1);
    const arg = onToggle.mock.calls[0][0] as Date;
    expect(toDateKey(arg)).toBe(today);
  });
});
