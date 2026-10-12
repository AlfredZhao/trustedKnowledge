/**
 * Mermaid Mindmap emits circular-node labels without a text anchor in some
 * versions. The label then starts at the circle centre instead of being
 * centred on it, which makes CJK labels visibly escape the right edge.
 */
export function normalizeMermaidSvg(svg: string) {
  const container = document.createElement("div");
  container.innerHTML = svg;
  centerMermaidMindmapCircleLabels(container);
  return container.innerHTML;
}

export function centerMermaidMindmapCircleLabels(container: ParentNode) {
  container.querySelectorAll<SVGGElement>(".mindmap-node").forEach((node) => {
    if (!node.querySelector("circle.basic")) return;
    node.querySelectorAll<SVGTextElement>(".label text").forEach((label) => {
      label.setAttribute("text-anchor", "middle");
    });
  });
}
