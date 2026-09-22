// Adapted from ashemag/human-atlas (MIT, see LICENSE-human-atlas).

/** Distinguishes a tap from an orbit, pinch, pan, or cancelled touch sequence. */
export class PointerTap {
  private active = new Map<number, { x: number; y: number; threshold: number }>();
  private blocked = false;

  down(id: number, x: number, y: number, threshold: number): void {
    if (this.active.size === 0) this.blocked = false;
    this.active.set(id, { x, y, threshold });
    if (this.active.size > 1) this.blocked = true;
  }

  move(id: number, x: number, y: number): void {
    const start = this.active.get(id);
    if (start && Math.hypot(x - start.x, y - start.y) > start.threshold) this.blocked = true;
  }

  up(id: number, x: number, y: number): boolean {
    this.move(id, x, y);
    const isTap = this.active.has(id) && this.active.size === 1 && !this.blocked;
    this.active.delete(id);
    return isTap;
  }

  cancel(id: number): void {
    this.active.delete(id);
    this.blocked = true;
  }
}
