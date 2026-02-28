/**
 * 信息图布局定义 — 21 种布局类型
 */

const LAYOUTS = {
  'bento-grid': {
    name: 'bento-grid',
    label: '便当网格',
    description: 'Modular grid layout with varied cell sizes, like a bento box',
    bestFor: ['overview', 'feature list', 'multi-topic summary'],
    visualStructure: 'Asymmetric grid with 4-8 cells of different sizes, each containing a data point or concept',
  },
  timeline: {
    name: 'timeline',
    label: '时间线',
    description: 'Chronological flow from left to right or top to bottom',
    bestFor: ['history', 'process', 'evolution', 'milestones'],
    visualStructure: 'Horizontal or vertical line with event nodes, dates, and descriptions branching off',
  },
  pyramid: {
    name: 'pyramid',
    label: '金字塔',
    description: 'Hierarchical layers from broad base to narrow top',
    bestFor: ['hierarchy', 'priorities', 'levels', 'needs'],
    visualStructure: 'Triangular shape divided into horizontal layers, widest at bottom, narrowest at top',
  },
  funnel: {
    name: 'funnel',
    label: '漏斗',
    description: 'Narrowing stages from wide top to narrow bottom',
    bestFor: ['conversion', 'filtering', 'selection process', 'stages'],
    visualStructure: 'Inverted trapezoid shape narrowing downward, each stage labeled with data',
  },
  matrix: {
    name: 'matrix',
    label: '矩阵',
    description: '2×2 or larger grid for categorization along two axes',
    bestFor: ['categorization', 'priority matrix', 'comparison along two dimensions'],
    visualStructure: 'Four quadrants with labeled axes, items placed in appropriate quadrants',
  },
  comparison: {
    name: 'comparison',
    label: '对比',
    description: 'Side-by-side comparison of two or more items',
    bestFor: ['versus', 'pros/cons', 'before/after', 'alternatives'],
    visualStructure: 'Two or more columns with matching rows for each comparison point',
  },
  flowchart: {
    name: 'flowchart',
    label: '流程图',
    description: 'Decision or process flow with branches and conditions',
    bestFor: ['decision making', 'algorithm', 'workflow', 'troubleshooting'],
    visualStructure: 'Connected shapes (rectangles, diamonds) with directional arrows showing flow',
  },
  'mind-map': {
    name: 'mind-map',
    label: '思维导图',
    description: 'Central idea with radiating branches and sub-branches',
    bestFor: ['brainstorming', 'concept exploration', 'topic overview'],
    visualStructure: 'Central node with organic branches radiating outward, sub-nodes on each branch',
  },
  cycle: {
    name: 'cycle',
    label: '循环',
    description: 'Circular flow showing a repeating process',
    bestFor: ['recurring process', 'feedback loop', 'lifecycle'],
    visualStructure: 'Circular arrangement of stages connected by curved arrows forming a closed loop',
  },
  hierarchy: {
    name: 'hierarchy',
    label: '层级',
    description: 'Tree structure showing parent-child relationships',
    bestFor: ['organization', 'taxonomy', 'classification'],
    visualStructure: 'Top-down tree with connecting lines, wider at each lower level',
  },
  radar: {
    name: 'radar',
    label: '雷达图',
    description: 'Multi-axis chart showing performance across dimensions',
    bestFor: ['multi-dimensional evaluation', 'skill assessment', 'product comparison'],
    visualStructure: 'Polygon shape on radial axes, each axis representing a dimension',
  },
  scatter: {
    name: 'scatter',
    label: '散点图',
    description: 'Points plotted on X-Y axes showing relationships',
    bestFor: ['correlation', 'distribution', 'clustering'],
    visualStructure: 'Dot plot on labeled X and Y axes with data points and optional trend line',
  },
  'org-chart': {
    name: 'org-chart',
    label: '组织架构',
    description: 'Hierarchical structure showing reporting relationships',
    bestFor: ['team structure', 'reporting lines', 'department layout'],
    visualStructure: 'Connected boxes in hierarchical layout with clear reporting lines',
  },
  kanban: {
    name: 'kanban',
    label: '看板',
    description: 'Column-based board for workflow visualization',
    bestFor: ['task management', 'status tracking', 'workflow stages'],
    visualStructure: 'Vertical columns (To Do, In Progress, Done) with card items in each',
  },
  roadmap: {
    name: 'roadmap',
    label: '路线图',
    description: 'Timeline-based plan with phases and milestones',
    bestFor: ['project planning', 'product roadmap', 'strategic plan'],
    visualStructure: 'Horizontal timeline with swim lanes, milestones, and phase markers',
  },
  venn: {
    name: 'venn',
    label: '维恩图',
    description: 'Overlapping circles showing relationships and intersections',
    bestFor: ['overlap analysis', 'shared properties', 'set relationships'],
    visualStructure: 'Two or three overlapping circles with labeled intersections',
  },
  swot: {
    name: 'swot',
    label: 'SWOT',
    description: 'Four-quadrant analysis grid for strategic planning',
    bestFor: ['strategic analysis', 'business planning', 'competitive analysis'],
    visualStructure: '2×2 grid labeled Strengths, Weaknesses, Opportunities, Threats',
  },
  process: {
    name: 'process',
    label: '过程',
    description: 'Linear step-by-step process flow',
    bestFor: ['instructions', 'procedure', 'sequence'],
    visualStructure: 'Numbered steps connected by arrows in a linear sequence',
  },
  dashboard: {
    name: 'dashboard',
    label: '仪表盘',
    description: 'Multi-metric dashboard with various chart types',
    bestFor: ['KPIs', 'performance metrics', 'status overview'],
    visualStructure: 'Grid of small charts, gauges, and numbers showing key metrics',
  },
  isometric: {
    name: 'isometric',
    label: '等距视图',
    description: '3D isometric view for spatial or architectural concepts',
    bestFor: ['architecture', 'spatial layout', 'system design'],
    visualStructure: 'Isometric 3D illustration showing components in pseudo-3D space',
  },
  'stacked-cards': {
    name: 'stacked-cards',
    label: '堆叠卡片',
    description: 'Overlapping cards for layered or sequential information',
    bestFor: ['tips', 'key points', 'feature highlights'],
    visualStructure: 'Overlapping card shapes, each containing a key point with icon and text',
  },
};

/**
 * 根据内容分析推荐布局
 * @param {object} analysis - 内容分析结果
 * @returns {string[]} 推荐的布局 key 列表 (3-5个)
 */
function recommendLayouts(analysis) {
  const scores = {};
  for (const [key, layout] of Object.entries(LAYOUTS)) {
    let score = 0;
    const features = analysis.features || [];
    // Match content features to layout best-for
    for (const feature of features) {
      for (const use of layout.bestFor) {
        if (feature.toLowerCase().includes(use) || use.includes(feature.toLowerCase())) {
          score += 3;
        }
      }
    }
    // Bonus for matching structure type
    if (analysis.hasTimeline && key === 'timeline') score += 5;
    if (analysis.hasComparison && (key === 'comparison' || key === 'matrix')) score += 5;
    if (analysis.hasHierarchy && (key === 'hierarchy' || key === 'pyramid')) score += 5;
    if (analysis.hasProcess && (key === 'flowchart' || key === 'process')) score += 5;
    if (analysis.hasList && (key === 'stacked-cards' || key === 'bento-grid')) score += 3;
    if (analysis.hasData && (key === 'dashboard' || key === 'radar')) score += 4;
    scores[key] = score;
  }

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key]) => key);
}

module.exports = { LAYOUTS, recommendLayouts };
