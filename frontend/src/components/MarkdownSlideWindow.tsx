import { useEffect, useState } from "react";

import MarkdownSlides from "./MarkdownSlides";
import { receiveSlideSnapshot, SLIDES_QUERY_KEY, type SlideSnapshot } from "../utils/markdownSlidesSession";

export default function MarkdownSlideWindow() {
  const [snapshot, setSnapshot] = useState<SlideSnapshot | null>(null);
  const [error, setError] = useState("");
  useEffect(() => receiveSlideSnapshot(new URLSearchParams(window.location.search).get(SLIDES_QUERY_KEY) ?? "", setSnapshot, (message) => {
    setSnapshot(null);
    setError(message);
  }), []);
  const close = () => {
    setSnapshot(null);
    setError("放映已结束，可关闭此标签页或返回工作台。");
    window.close();
  };
  if (snapshot && !error) return <MarkdownSlides snapshot={snapshot} standalone onClose={close} />;
  return <div className="slide-screen slide-status"><p role="status">{error || "正在接收编辑器内容…"}</p>
    <button className="slide-control" type="button" onClick={() => { const url = new URL(window.location.href); url.searchParams.delete(SLIDES_QUERY_KEY); window.location.replace(url.href); }}>返回工作台</button>
  </div>;
}
