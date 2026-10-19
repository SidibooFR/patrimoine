import { describe, it, expect } from "vitest";
import { appearance } from "../src/lib/appearance";
import { moneyAxis, mergeOptions, styleC } from "../src/lib/charts";

// l'Intl français utilise des espaces insécables
const n = (s: string) => s.replace(/\s/g, " ");

describe("moneyAxis", () => {
  it("abrège en k et M dans la devise d'affichage", () => {
    appearance.currency = "EUR";
    expect(n(moneyAxis(150000))).toBe("150 k €");
    expect(n(moneyAxis(1200000))).toBe("1,2 M €");
    expect(n(moneyAxis(950))).toBe("950 €");
  });
  it("suit la devise choisie", () => { appearance.currency = "USD"; expect(n(moneyAxis(150000))).toContain("$"); appearance.currency = "EUR"; });
});
describe("mergeOptions", () => {
  it("fusionne en profondeur, remplace les tableaux, ne mute pas", () => {
    const base = { chart: { toolbar: { show: false }, height: 260 }, colors: ["#a"] };
    const out = mergeOptions(base, { chart: { toolbar: { show: true } }, colors: ["#b"] } as typeof base);
    expect(out).toEqual({ chart: { toolbar: { show: true }, height: 260 }, colors: ["#b"] });
    expect(base.chart.toolbar.show).toBe(false);
  });
});
describe("styleC", () => {
  const ui = { muted: "#5e5e5e", line: "#e1e3e1", font: "Roboto" };
  it("active le zoom horizontal et la barre d'outils seulement si demandé", () => {
    expect(styleC("area", true, ui).chart?.zoom).toMatchObject({ enabled: true, type: "x" });
    expect(styleC("area", true, ui).chart?.toolbar).toMatchObject({ show: true, tools: { download: false } });
    expect(styleC("area", false, ui).chart?.toolbar?.show).toBe(false);
  });
  it("arrondit les barres et règle les anneaux", () => {
    expect(styleC("bar", false, ui).plotOptions?.bar).toMatchObject({ borderRadius: 6, borderRadiusApplication: "end", columnWidth: "55%" });
    expect(styleC("donut", false, ui).plotOptions?.pie?.donut?.size).toBe("68%");
  });
  it("applique police, animation et infobulle partagée", () => {
    const o = styleC("line", false, ui);
    expect(o.chart?.fontFamily).toBe("Roboto");
    expect(o.chart?.animations).toMatchObject({ enabled: true, speed: 700 });
    expect(o.tooltip).toMatchObject({ shared: true, intersect: false });
  });
});
