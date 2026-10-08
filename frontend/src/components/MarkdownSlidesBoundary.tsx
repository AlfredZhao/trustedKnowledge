import { Component, type ReactNode } from "react";

/** A missing offline chunk or a rendering failure must never discard the editor draft. */
export class MarkdownSlidesBoundary extends Component<{ children: ReactNode; onClose: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="slide-screen slide-status" role="alert"><p>幻灯片加载失败，原文未被修改。可返回继续编辑；保存草稿后刷新页面重试。</p>
      <button className="slide-control" type="button" autoFocus onClick={this.props.onClose}>返回</button>
    </div>;
  }
}
