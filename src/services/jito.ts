import { JitoTipFloor } from "../types.js";

export class JitoService {
  private tipFloorUrl = "https://bundles.jito.wtf/api/v1/bundles/tip_floor";

  /**
   * Fetch current Jito bundle tip floor percentiles
   */
  public async getTipFloor(): Promise<JitoTipFloor | null> {
    try {
      const res = await fetch(this.tipFloorUrl);
      if (!res.ok) return null;
      const data = (await res.json()) as JitoTipFloor[];
      return data && data.length > 0 ? data[0] : null;
    } catch {
      return null;
    }
  }
}
