import { ChevronLeft, ChevronRight, List, Minimize } from "lucide-react";
import type { useSlidePresentation } from "./useSlidePresentation";

interface Props {
  presentation: ReturnType<typeof useSlidePresentation>;
  index: number;
  count: number;
  busy: boolean;
  message?: string;
  onNavigate: (index: number) => void;
  onDirectory: () => void;
  onDetail: () => void;
}

export default function SlidePresentationControls({ presentation, index, count, busy, message, onNavigate, onDirectory, onDetail }: Props) {
  if (!presentation.active) return null;
  return <div className="slide-presentation-controls" data-slide-presentation-controls data-visible={presentation.controlsVisible}
    onPointerEnter={event => { if (event.pointerType === "mouse") presentation.hover(true); }}
    onPointerLeave={() => presentation.hover(false)} onBlur={presentation.reveal}>
    <div className="slide-presentation-actions" role="group" aria-label="幻灯片放映控制">
      <button className="slide-control" type="button" aria-label="上一页" disabled={busy || index <= 0} onClick={() => onNavigate(index - 1)}><ChevronLeft size={18} /></button>
      <span className="slide-presentation-count" aria-live="polite">{count ? index + 1 : 0} / {count}</span>
      <button className="slide-control" type="button" aria-label="下一页" disabled={busy || !count || index >= count - 1} onClick={() => onNavigate(index + 1)}><ChevronRight size={18} /></button>
      <button className="slide-control" type="button" disabled={busy || !count} onClick={onDirectory}><List size={16} />目录</button>
      <button className="slide-control" type="button" disabled={busy || !count} onClick={onDetail}>展开本页</button>
      <button className="slide-control" type="button" onClick={presentation.leave}><Minimize size={16} />退出放映</button>
    </div>
    {(presentation.notice || message) && <p className="slide-presentation-hint" role="status">{presentation.notice || message}</p>}
  </div>;
}
