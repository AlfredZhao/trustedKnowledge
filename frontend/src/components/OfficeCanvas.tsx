import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { OfficeAsset, OfficeElement, OfficePage, OfficePreview, OfficeRun } from "../utils/officeTypes";

export function OfficeRuns({ runs }: { runs: OfficeRun[] }) {
  return <>{runs.map((run, index) => {
    const style: CSSProperties = { fontWeight: run.bold ? 700 : undefined, fontStyle: run.italic ? "italic" : undefined, fontFamily: run.code ? "Consolas, monospace" : undefined };
    return run.href ? <a key={index} href={run.href} target="_blank" rel="noreferrer" style={style}>{run.text}</a> : <span key={index} style={style}>{run.text}</span>;
  })}</>;
}

export function OfficePageText({ page, assets }: { page: OfficePage; assets: OfficeAsset[] }) {
  return <div className="office-page-text">{page.elements.map(item => item.kind === "text"
    ? <p key={item.name} style={{ whiteSpace: "pre-wrap", fontWeight: item.bold ? "bold" : undefined }}><OfficeRuns runs={item.runs || []} /></p>
    : item.kind === "image" ? <img key={item.name} src={`data:image/png;base64,${assets.find(asset => asset.id === item.asset)?.data || ""}`} alt={assets.find(asset => asset.id === item.asset)?.alt || ""} />
    : item.kind === "table" ? <div key={item.name} className="office-table-scroll"><table><tbody>{item.rows?.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}><OfficeRuns runs={cell} /></td>)}</tr>)}</tbody></table></div>
    : <hr key={item.name} />)}{page.notes?.map((note, i) => <details key={i}><summary>Mermaid 源码（导出到演讲者备注）</summary><pre>{note.text}</pre></details>)}</div>;
}

export default function OfficeCanvas({ preview, page, assets }: { preview: OfficePreview; page: OfficePage; assets: OfficeAsset[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(.5);
  useLayoutEffect(() => {
    const node = ref.current!;
    const resize = () => setScale(Math.max(.01, Math.min(node.clientWidth / 960, node.clientHeight / 540)));
    const observer = new ResizeObserver(resize); observer.observe(node); resize();
    return () => observer.disconnect();
  }, []);
  const geometry = (item: { x: number; y: number; w: number; h: number }): CSSProperties => ({ position: "absolute", left: item.x, top: item.y, width: item.w, height: item.h, boxSizing: "border-box" });
  const element = (item: OfficeElement) => {
    const style = geometry(item);
    if (item.kind === "text") return <div key={item.name} className="office-canvas-text" data-office-object={item.name} style={{ ...style, fontSize: item.size, fontWeight: item.bold ? 700 : undefined, fontFamily: item.code ? `${preview.fonts.code}, ${preview.fonts.east_asia}, monospace` : undefined, background: item.code || item.quote ? `#${preview.colors.table_alternate}` : undefined }}>{item.line_runs ? item.line_runs.map((runs, i) => <div key={i} style={{ whiteSpace: "pre", minHeight: "1.4em" }}><OfficeRuns runs={runs} /></div>) : <OfficeRuns runs={item.runs || []} />}</div>;
    if (item.kind === "image") {
      const asset = assets.find(value => value.id === item.asset);
      return <img key={item.name} style={style} src={`data:image/png;base64,${asset?.data || ""}`} alt={asset?.alt || ""} />;
    }
    if (item.kind === "table") return <table key={item.name} className="office-canvas-table" data-office-object={item.name} style={{ ...style, fontSize: item.size }}><colgroup>{item.widths?.map((width, index) => <col key={index} style={{ width }} />)}</colgroup><tbody>{item.rows?.map((row, index) => <tr key={index} style={{ height: item.heights?.[index], background: index === 0 ? `#${preview.colors.table_header}` : index % 2 ? `#${preview.colors.table_alternate}` : "white", color: index === 0 ? "white" : undefined, fontWeight: index === 0 ? "bold" : undefined }}>{row.map((cell, i) => <td key={i}><OfficeRuns runs={cell} /></td>)}</tr>)}</tbody></table>;
    return <div key={item.name} style={{ ...style, background: `#${preview.colors.accent}` }} />;
  };
  return <div ref={ref} className="office-canvas-stage">
    <div style={{ width: 960 * scale, height: 540 * scale, position: "relative", flex: "none" }}>
      <article className="office-canvas" aria-label={`AIBS 模板页：${page.title}`} style={{ transform: `scale(${scale})`, background: `#${preview.colors.paper}`, color: `#${preview.colors.text}`, fontFamily: `${preview.fonts.latin}, ${preview.fonts.east_asia}, sans-serif` }}>
        {preview.decorations[page.layout]?.map((item, index) => item.src ? <img key={index} style={geometry(item)} src={item.src} alt="" /> : <span key={index} style={{ ...geometry(item), border: "1px dashed #c74634", fontSize: 6 }} title="该品牌装饰在 Office 中显示">{item.unsupported}</span>)}
        {page.elements.map(element)}
        <span className="office-canvas-footer" style={{ left: 60 }}>{preview.pages.indexOf(page) + 1}</span>
        <span className="office-canvas-footer" style={{ left: 88 }}>{preview.copyright}</span>
        <span className="office-canvas-footer" style={{ left: 648 }}>{preview.footer}</span>
      </article>
    </div>
  </div>;
}
