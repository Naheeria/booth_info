import { useState, useRef } from "react";
// @ts-expect-error ESM import from CDN which TypeScript does not recognize
import { toPng } from "https://esm.sh/html-to-image@1.11.11";

const FONT = "'Pretendard Variable','Noto Sans KR',-apple-system,BlinkMacSystemFont,system-ui,sans-serif";

const THEMES = [
  { name: "Paper", bg: "#f5f3ee", card: "#fffff8", accent: "#1d1d1f", accent2: "#c8102e", text: "#1d1d1f", sub: "#86868b", border: "#ddd8ce", badge: "#1d1d1f", badgeText: "#fff", pattern: "rgba(0,0,0,.03)" },
  { name: "Midnight", bg: "#101018", card: "#1a1a24", accent: "#e0e0e4", accent2: "#ff6b6b", text: "#eeeef2", sub: "#707080", border: "#2a2a38", badge: "#e0e0e4", badgeText: "#101018", pattern: "rgba(255,255,255,.025)" },
  { name: "Blossom", bg: "#fff0f3", card: "#ffffff", accent: "#c43a5e", accent2: "#e8668a", text: "#2d1f24", sub: "#b0909a", border: "#f0d0d8", badge: "#c43a5e", badgeText: "#fff", pattern: "rgba(196,58,94,.04)" },
  { name: "Ocean", bg: "#e8f0fa", card: "#ffffff", accent: "#1a4a8a", accent2: "#2e7dd6", text: "#152030", sub: "#6888a8", border: "#c0d4ee", badge: "#1a4a8a", badgeText: "#fff", pattern: "rgba(26,74,138,.04)" },
  { name: "Lavender", bg: "#f0eaff", card: "#ffffff", accent: "#5b2d9e", accent2: "#8b5cf6", text: "#1f1830", sub: "#8878a8", border: "#d4c4f0", badge: "#5b2d9e", badgeText: "#fff", pattern: "rgba(91,45,158,.04)" },
  { name: "Matcha", bg: "#eef5ec", card: "#ffffff", accent: "#2d6b3a", accent2: "#4a9e5a", text: "#1a241c", sub: "#6e8a70", border: "#c4dcc6", badge: "#2d6b3a", badgeText: "#fff", pattern: "rgba(45,107,58,.04)" },
  { name: "Honey", bg: "#fff8e8", card: "#ffffff", accent: "#8a6200", accent2: "#d4a020", text: "#2e2510", sub: "#a89868", border: "#e8d8a8", badge: "#8a6200", badgeText: "#fff", pattern: "rgba(138,98,0,.04)" },
];

const GRIDS = [
  { label: "2칸", cols: 2, count: 2 },
  { label: "3칸", cols: 3, count: 3 },
  { label: "4칸", cols: 2, count: 4 },
  { label: "5칸", cols: 3, count: 5 },
  { label: "6칸", cols: 3, count: 6 },
];

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const makeItem = () => ({ id: uid(), image: null, title: "", spec: "", price: "", synopsis: "", rating: "none", customText: "" });

/* ── IME-safe input ── */
function CInput({ value, onChange, multiline, style, ...rest }: {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  style?: React.CSSProperties;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onCompositionStart' | 'onCompositionEnd'> & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'onCompositionStart' | 'onCompositionEnd'>) {
  const [local, setLocal] = useState(value);
  const comp = useRef(false);
  const Tag = multiline ? "textarea" : "input";
  return (
    <Tag
      value={local}
      onChange={(e) => {
        setLocal(e.target.value);
        if (!comp.current) onChange(e.target.value);
      }}
      onCompositionStart={() => { comp.current = true; }}
      onCompositionEnd={(e: React.CompositionEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        comp.current = false;
        setLocal((e.target as HTMLInputElement | HTMLTextAreaElement).value);
        onChange((e.target as HTMLInputElement | HTMLTextAreaElement).value);
      }}
      style={style}
      {...rest}
    />
  );
}

/* ── PNG capture ── */
async function capturePng(node: HTMLElement, scale = 2) {
  const w = node.scrollWidth, h = node.scrollHeight;
  const clone = node.cloneNode(true) as HTMLElement;
  const srcEls = node.querySelectorAll("*"), clnEls = clone.querySelectorAll("*");
  const cp = (s: Element, d: HTMLElement) => { const cs = getComputedStyle(s); for (let i = 0; i < cs.length; i++) d.style.setProperty(cs[i], cs.getPropertyValue(cs[i])); };
  cp(node, clone); for (let i = 0; i < srcEls.length; i++) cp(srcEls[i], clnEls[i] as HTMLElement);
  clone.style.margin = "0";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${clone.outerHTML}</div></foreignObject></svg>`;
  const canvas = Object.assign(document.createElement("canvas"), { width: w * scale, height: h * scale });
  const ctx = canvas.getContext("2d")!; ctx.scale(scale, scale);
  return new Promise((ok, fail) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    img.onload = () => { ctx.drawImage(img, 0, 0); URL.revokeObjectURL(blobUrl); canvas.toBlob(b => b ? ok(b) : fail(), "image/png"); };
    img.onerror = () => { URL.revokeObjectURL(blobUrl); fail(); };
    img.src = blobUrl;
  });
}

/* ═════════════════════════════════════════ */
export default function DoujinInfoBuilder() {
  const [tab, setTab] = useState("edit");
  const [theme, setTheme] = useState(THEMES[0]);
  const [grid, setGrid] = useState(GRIDS[2]);
  const [detail, setDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const cardRef = useRef(null);

  const [info, setInfo] = useState({ eventName: "", date: "", hours: "", boothLocation: "", boothName: "", nickname: "", sns: "" });
  const [boothNote, setBoothNote] = useState("");
  const [items, setItems] = useState(() => Array.from({ length: 4 }, makeItem));

  const set = (k: keyof typeof info, v: string) => setInfo(p => ({ ...p, [k]: v }));
  const setI = (i: number, k: keyof typeof items[0], v: string | null) => setItems(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));

  const handleImg = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { alert("10MB 이하의 이미지만 업로드할 수 있습니다."); return; }
    const r = new FileReader();
    r.onload = ev => setI(idx, "image", ev.target?.result as string);
    r.readAsDataURL(f);
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    setItems(p => {
      const next = [...p];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return p;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const changeGrid = (g: typeof GRIDS[0]) => {
    setGrid(g);
    setItems(p => p.length >= g.count ? p.slice(0, g.count) : [...p, ...Array.from({ length: g.count - p.length }, makeItem)]);
  };

  const getBlob = async (): Promise<Blob> => {
    if (!cardRef.current) throw new Error();
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true, skipFonts: true });
      return await (await fetch(dataUrl)).blob();
    } catch {
      return await capturePng(cardRef.current, 2) as Blob;
    }
  };

  const download = async () => {
    if (!cardRef.current || saving) return;
    setSaving(true);
    try {
      const blob = await getBlob();
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${info.boothName || "info"}.png` });
      a.click(); URL.revokeObjectURL(a.href);
    } catch { alert("이미지 저장 실패. 스크린샷을 이용해주세요."); }
    finally { setSaving(false); }
  };

  const copyToClipboard = async () => {
    if (!cardRef.current || copying) return;
    setCopying(true);
    try {
      const blob = await getBlob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    } catch { alert("클립보드 복사 실패. 이미지로 저장 후 이용해주세요."); }
    finally { setCopying(false); }
  };

  const c = theme;
  const shown = items.slice(0, grid.count);

  const inp = {
    width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 10,
    border: `1px solid ${c.border}`, background: c.card, color: c.text,
    fontSize: 14, fontFamily: FONT, outline: "none", transition: "border-color .2s",
  };
  const fc = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { (e.target as HTMLElement).style.borderColor = c.accent; };
  const bl = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { (e.target as HTMLElement).style.borderColor = c.border; };
  const lbl = { fontSize: 11, fontWeight: 600, color: c.sub, letterSpacing: ".04em", marginBottom: 3, display: "block" };
  const sec = { fontSize: 12, fontWeight: 700, color: c.sub, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 };

  /* ══════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text, fontFamily: FONT, transition: "background .3s,color .3s" }}>

      {/* Sticky header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: `${c.bg}ee`, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${c.border}`,
      }}>
        <div style={{ padding: "14px 20px 0", textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.03em", margin: 0 }}>인포 빌더</h1>
          <p style={{ fontSize: 11, color: c.sub, margin: "2px 0 0" }}>동인 행사 인포를 쉽게 만들어보세요</p>
        </div>
        <div style={{ display: "flex", padding: "10px 20px 0" }}>
          {[["edit", "편집"], ["preview", "프리뷰"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              flex: 1, padding: "10px 0", background: "none", border: "none", fontFamily: FONT,
              borderBottom: tab === k ? `2.5px solid ${c.accent}` : "2.5px solid transparent",
              color: tab === k ? c.accent : c.sub, fontSize: 14, fontWeight: tab === k ? 700 : 500,
              cursor: "pointer", transition: "all .2s",
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px 56px" }}>

        {/* ════ EDIT ════ */}
        {tab === "edit" && <>
          {/* Theme */}
          <div style={{ marginBottom: 22 }}>
            <div style={sec}>Color Theme</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {THEMES.map(th => (
                <button key={th.name} onClick={() => setTheme(th)} title={th.name} style={{
                  width: 42, height: 42, borderRadius: 12, cursor: "pointer", transition: "all .2s",
                  border: c.name === th.name ? `2.5px solid ${th.accent}` : `1.5px solid ${th.border}`,
                  background: `linear-gradient(135deg,${th.bg} 50%,${th.accent} 50%)`,
                  transform: c.name === th.name ? "scale(1.12)" : "scale(1)",
                  boxShadow: c.name === th.name ? `0 0 0 3px ${th.accent}22` : "none",
                }} />
              ))}
            </div>
          </div>

          {/* Grid */}
          <div style={{ marginBottom: 22 }}>
            <div style={sec}>Grid Template</div>
            <div style={{ display: "flex", gap: 6 }}>
              {GRIDS.map(g => {
                const on = grid.label === g.label;
                return <button key={g.label} onClick={() => changeGrid(g)} style={{
                  flex: 1, padding: "8px 0", borderRadius: 10, cursor: "pointer", fontFamily: FONT,
                  border: on ? `2px solid ${c.accent}` : `1.5px solid ${c.border}`,
                  background: on ? `${c.accent}12` : c.card, color: on ? c.accent : c.sub,
                  fontSize: 13, fontWeight: 600, transition: "all .2s",
                }}>{g.label}</button>;
              })}
            </div>
          </div>

          {/* Detail toggle */}
          <div style={{ marginBottom: 22 }}>
            <div style={sec}>Display Mode</div>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                [false, "간단 보기"],
                [true, "상세 보기"],
              ].map(([val, label]) => {
                const on = detail === val;
                return <button key={String(val)} onClick={() => setDetail(val as boolean)} style={{
                  flex: 1, padding: "8px 0", borderRadius: 10, cursor: "pointer", fontFamily: FONT,
                  border: on ? `2px solid ${c.accent}` : `1.5px solid ${c.border}`,
                  background: on ? `${c.accent}12` : c.card, color: on ? c.accent : c.sub,
                  fontSize: 13, fontWeight: 600, transition: "all .2s",
                }}>{label}</button>;
              })}
            </div>
            <p style={{ fontSize: 11, color: c.sub, marginTop: 6 }}>
              {detail ? "이미지 + 가격/규격/시놉시스를 가로 배치합니다" : "이미지 위에 정보가 들어가는 카드형 레이아웃입니다"}
            </p>
          </div>

          {/* Event info */}
          <div style={{ marginBottom: 22 }}>
            <div style={sec}>Event Info</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* 행사명 */}
              <div>
                <label style={lbl}>행사명</label>
                <CInput value={info.eventName} onChange={v => set("eventName", v)} placeholder="서울코믹월드" style={inp as React.CSSProperties} onFocus={fc} onBlur={bl} />
              </div>
              {/* 일시와 운영시간 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={lbl}>일시</label>
                  <CInput value={info.date} onChange={v => set("date", v)} placeholder="2026.04.05 (일)" style={inp as React.CSSProperties} onFocus={fc} onBlur={bl} />
                </div>
                <div>
                  <label style={lbl}>운영시간</label>
                  <CInput value={info.hours} onChange={v => set("hours", v)} placeholder="11:00 – 16:00" style={inp as React.CSSProperties} onFocus={fc} onBlur={bl} />
                </div>
              </div>
              {/* 부스 위치와 서클명 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={lbl}>부스 위치</label>
                  <CInput value={info.boothLocation} onChange={v => set("boothLocation", v)} placeholder="A홀 23번" style={inp as React.CSSProperties} onFocus={fc} onBlur={bl} />
                </div>
                <div>
                  <label style={lbl}>부스명(서클명)</label>
                  <CInput value={info.boothName} onChange={v => set("boothName", v)} placeholder="달빛서재" style={inp as React.CSSProperties} onFocus={fc} onBlur={bl} />
                </div>
              </div>
              {/* 닉네임과 SNS */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={lbl}>닉네임</label>
                  <CInput value={info.nickname} onChange={v => set("nickname", v)} placeholder="하늘" style={inp as React.CSSProperties} onFocus={fc} onBlur={bl} />
                </div>
                <div>
                  <label style={lbl}>SNS</label>
                  <CInput value={info.sns} onChange={v => set("sns", v)} placeholder="@sky_draw" style={inp as React.CSSProperties} onFocus={fc} onBlur={bl} />
                </div>
              </div>
            </div>
          </div>

          {/* Booth note */}
          <div style={{ marginBottom: 22 }}>
            <div style={sec}>부스 주의사항</div>
            <CInput multiline value={boothNote} onChange={setBoothNote}
              placeholder="예: 현금 / 계좌이체만 가능합니다.&#10;파본은 인쇄소 규정을 따릅니다." rows={3}
              style={{ ...inp, resize: "vertical", lineHeight: 1.6 } as React.CSSProperties} onFocus={fc} onBlur={bl} />
          </div>

          {/* Items */}
          <div style={{ marginBottom: 22 }}>
            <div style={sec}>Goods / Books</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {items.map((item, idx) => (
                <div key={item.id} style={{ padding: 14, borderRadius: 14, border: `1px solid ${c.border}`, background: c.card }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: c.accent }}>#{idx + 1}</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} style={{
                        width: 28, height: 28, borderRadius: 6, border: `1px solid ${c.border}`,
                        background: idx === 0 ? "transparent" : c.bg, color: idx === 0 ? c.border : c.text,
                        fontSize: 14, cursor: idx === 0 ? "default" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>↑</button>
                      <button onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1} style={{
                        width: 28, height: 28, borderRadius: 6, border: `1px solid ${c.border}`,
                        background: idx === items.length - 1 ? "transparent" : c.bg, color: idx === items.length - 1 ? c.border : c.text,
                        fontSize: 14, cursor: idx === items.length - 1 ? "default" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>↓</button>
                    </div>
                  </div>

                  {/* Image upload — simple label wrapping approach */}
                  <div style={{ marginBottom: 10 }}>
                    {item.image ? (
                      <div style={{ position: "relative" }}>
                        <img src={item.image} alt="" style={{ width: "100%", height: 140, objectFit: "contain", display: "block", background: c.bg, borderRadius: 10 }} />
                        <button onClick={() => setI(idx, "image", null)} style={{
                          position: "absolute", top: 6, right: 6, width: 28, height: 28, borderRadius: "50%",
                          border: "none", background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 15,
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        }}>×</button>
                      </div>
                    ) : (
                      <div style={{ position: "relative", height: 96, borderRadius: 10, border: `1.5px dashed ${c.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: c.sub, fontSize: 13, gap: 3 }}>
                        <span style={{ fontSize: 24, lineHeight: 1 }}>+</span>
                        <span>이미지 업로드</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => handleImg(idx, e)}
                          style={{
                            position: "absolute", inset: 0, opacity: 0, cursor: "pointer",
                            width: "100%", height: "100%",
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Badge selector */}
                  <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: c.sub, letterSpacing: ".04em" }}>뱃지:</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {["R15", "R18"].map(val => (
                        <button
                          key={val}
                          onClick={() => setI(idx, "rating", item.rating === val ? "none" : val)}
                          style={{
                            flexShrink: 0,
                            padding: "6px 12px",
                            borderRadius: 6,
                            border: `2px solid ${item.rating === val ? (val === "R15" ? "#FF9500" : "#FF3333") : c.border}`,
                            background: item.rating === val ? (val === "R15" ? "#FF9500" : "#FF3333") : "transparent",
                            color: item.rating === val ? "#fff" : c.text,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all .2s",
                          }}>
                          {val}
                        </button>
                      ))}
                      <CInput value={item.customText} onChange={v => setI(idx, "customText", v)} placeholder="소량, 현판 ONLY 등" style={{ ...inp, flex: 1 } as React.CSSProperties} onFocus={fc} onBlur={bl} />
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <CInput value={item.title} onChange={v => setI(idx, "title", v)} placeholder="제목" style={inp as React.CSSProperties} onFocus={fc} onBlur={bl} />
                    <CInput value={item.spec} onChange={v => setI(idx, "spec", v)} placeholder="규격 (예: A5 / 40p)" style={inp as React.CSSProperties} onFocus={fc} onBlur={bl} />
                    <CInput value={item.price} onChange={v => setI(idx, "price", v)} placeholder="가격 (예: 8,000원)" style={inp as React.CSSProperties} onFocus={fc} onBlur={bl} />
                    {detail && (
                      <CInput multiline value={item.synopsis} onChange={v => setI(idx, "synopsis", v)}
                        placeholder="시놉시스 / 상세 설명" rows={3}
                        style={{ ...inp, resize: "vertical", lineHeight: 1.6 } as React.CSSProperties} onFocus={fc} onBlur={bl} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>}

        {/* ════ PREVIEW ════ */}
        {tab === "preview" && <>
          <div ref={cardRef} style={{
            background: c.bg, overflow: "hidden", fontFamily: FONT,
            backgroundImage: `linear-gradient(${c.pattern} 1px,transparent 1px),linear-gradient(90deg,${c.pattern} 1px,transparent 1px)`,
            backgroundSize: "24px 24px",
            border: `3px solid ${c.accent}`, borderRadius: 4,
          }}>
            {/* ── HEADER ── */}
            <div style={{ padding: "20px 24px 18px", display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              {info.boothLocation && (
                <div style={{
                  background: c.badge, color: c.badgeText,
                  padding: "10px 16px", borderRadius: 6, flexShrink: 0, textAlign: "center",
                  border: `2px solid ${c.accent}`, minWidth: 60,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, opacity: .7, letterSpacing: ".06em" }}>부스위치</div>
                  <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-.02em", lineHeight: 1.1 }}>{info.boothLocation}</div>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 150 }}>
                {info.eventName && <div style={{ fontSize: 11, fontWeight: 600, color: c.sub, letterSpacing: ".04em", marginBottom: 4 }}>{info.eventName}</div>}
                {info.boothName && <div style={{ fontSize: 30, fontWeight: 900, color: c.text, letterSpacing: "-.02em", lineHeight: 1.15, wordBreak: "keep-all" }}>{info.boothName}</div>}
                {(info.nickname || info.sns) && (
                  <div style={{ fontSize: 13, color: c.sub, marginTop: 4, fontWeight: 500 }}>
                    {info.nickname}{info.sns && <span style={{ marginLeft: 6, color: c.accent2 }}>{info.sns}</span>}
                  </div>
                )}
              </div>
              {(info.date || info.hours) && (
                <div style={{ textAlign: "right", flexShrink: 0, fontSize: 13, color: c.text, lineHeight: 1.8 }}>
                  {info.date && <div><span style={{ fontSize: 11, fontWeight: 600, color: c.sub, marginRight: 8 }}>일시</span>{info.date}</div>}
                  {info.hours && <div><span style={{ fontSize: 11, fontWeight: 600, color: c.sub, marginRight: 8 }}>운영</span>{info.hours}</div>}
                </div>
              )}
            </div>

            {/* ── BOOTH NOTE (prominent card) ── */}
            {boothNote && (
              <div style={{
                margin: "0 16px 14px", padding: "14px 18px",
                background: c.card, border: `2px solid ${c.accent2}`,
                borderRadius: 8,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.accent2, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 6 }}>
                  Notice
                </div>
                <div style={{ fontSize: 12.5, color: c.text, lineHeight: 1.75, whiteSpace: "pre-wrap", wordBreak: "keep-all" }}>
                  {boothNote}
                </div>
              </div>
            )}

            {/* ── GOODS: Simple mode ── */}
            {!detail && (
              <div style={{ padding: "4px 16px 16px", display: "grid", gridTemplateColumns: `repeat(${grid.cols},1fr)`, gap: 10 }}>
                {shown.map(it => (
                  <div key={it.id} style={{ background: c.card, border: `2px solid ${c.border}`, borderRadius: 8, overflow: "hidden" }}>
                    <div style={{
                      width: "100%", aspectRatio: "3/4",
                      background: it.image ? c.card : `linear-gradient(160deg,${c.border}88,${c.bg})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: c.sub, fontSize: 11, borderBottom: `1px solid ${c.border}`,
                      overflow: "hidden",
                    }}>
                      {it.image
                        ? <img src={it.image} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                        : <span style={{ opacity: .35 }}>이미지 없음</span>
                      }
                    </div>
                    <div style={{ padding: "10px 12px 12px" }}>
                      {it.rating !== "none" && (
                        <div style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: 3,
                          background: it.rating === "R15" ? "#FF9500" : "#FF3333",
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 800,
                          marginRight: 4,
                          marginBottom: 4,
                          lineHeight: 1,
                        }}>
                          {it.rating}
                        </div>
                      )}
                      {it.customText && (
                        <div style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: 3,
                          background: c.accent2,
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 800,
                          marginBottom: 4,
                          lineHeight: 1,
                        }}>
                          {it.customText}
                        </div>
                      )}
                      {it.title && <div style={{ fontSize: 14, fontWeight: 800, color: c.text, lineHeight: 1.3, marginBottom: 3, wordBreak: "keep-all" }}>{it.title}</div>}
                      {it.spec && <div style={{ fontSize: 11, color: c.sub, marginBottom: 4 }}>{it.spec}</div>}
                      {it.price && (
                        <div style={{ display: "inline-block", padding: "3px 10px", borderRadius: 4, background: c.accent2, color: "#fff", fontSize: 14, fontWeight: 800 }}>{it.price}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── GOODS: Detail mode (horizontal layout) ── */}
            {detail && (
              <div style={{ padding: "4px 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                {shown.map(it => (
                  <div key={it.id} style={{
                    background: c.card, border: `2px solid ${c.border}`, borderRadius: 8,
                    overflow: "hidden", display: "flex", minHeight: 180,
                  }}>
                    {/* Left: image */}
                    <div style={{
                      width: "38%", flexShrink: 0,
                      background: it.image ? c.card : `linear-gradient(160deg,${c.border}88,${c.bg})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: c.sub, fontSize: 11, borderRight: `1px solid ${c.border}`,
                      overflow: "hidden",
                    }}>
                      {it.image
                        ? <img src={it.image} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                        : <span style={{ opacity: .35 }}>이미지 없음</span>
                      }
                    </div>
                    {/* Right: info */}
                    <div style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
                      {it.rating !== "none" && (
                        <div style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: 3,
                          background: it.rating === "R15" ? "#FF9500" : "#FF3333",
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 800,
                          marginBottom: 2,
                          marginRight: 4,
                          lineHeight: 1,
                          width: "fit-content",
                        }}>
                          {it.rating}
                        </div>
                      )}
                      {it.customText && (
                        <div style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: 3,
                          background: c.accent2,
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 800,
                          marginBottom: 2,
                          lineHeight: 1,
                          width: "fit-content",
                        }}>
                          {it.customText}
                        </div>
                      )}
                      {it.title && <div style={{ fontSize: 16, fontWeight: 800, color: c.text, lineHeight: 1.3, wordBreak: "keep-all" }}>{it.title}</div>}
                      {it.spec && <div style={{ fontSize: 12, color: c.sub }}>{it.spec}</div>}
                      {it.price && (
                        <div style={{ marginTop: 2 }}>
                          <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 4, background: c.accent2, color: "#fff", fontSize: 15, fontWeight: 800 }}>{it.price}</span>
                        </div>
                      )}
                      {it.synopsis && (
                        <div style={{
                          marginTop: 6, paddingTop: 6, borderTop: `1px solid ${c.border}`,
                          fontSize: 12, color: c.sub, lineHeight: 1.7,
                          whiteSpace: "pre-wrap", wordBreak: "keep-all",
                        }}>{it.synopsis}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div style={{
              padding: "10px 20px 14px", borderTop: `1px solid ${c.border}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{ fontSize: 10, color: c.sub }}>{info.boothName || ""}{info.sns ? ` · ${info.sns}` : ""}</div>
              <div style={{ fontSize: 10, color: c.sub }}>{info.eventName || ""}</div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={copyToClipboard} disabled={copying} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              flex: 1, padding: "14px 0", borderRadius: 12,
              border: `2px solid ${c.accent}`, background: c.bg, color: c.accent,
              fontSize: 15, fontWeight: 700, fontFamily: FONT,
              cursor: copying ? "wait" : "pointer", opacity: copying ? .6 : 1, transition: "opacity .2s",
            }}>
              {copying ? "복사 중…" : "클립보드에 복사"}
              {!copying && <span style={{ fontSize: 18 }}>⧉</span>}
            </button>
            <button onClick={download} disabled={saving} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              flex: 1, padding: "14px 0", borderRadius: 12,
              border: `2px solid ${c.accent}`, background: c.accent, color: c.badgeText,
              fontSize: 15, fontWeight: 700, fontFamily: FONT,
              cursor: saving ? "wait" : "pointer", opacity: saving ? .6 : 1, transition: "opacity .2s",
            }}>
              {saving ? "저장 중…" : "이미지로 저장하기"}
              {!saving && <span style={{ fontSize: 18 }}>↓</span>}
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: 11, color: c.sub, marginTop: 10 }}>PNG 2x 해상도로 저장됩니다</p>
        </>}
      </div>
    </div>
  );
}
