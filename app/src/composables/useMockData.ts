import type { Solution, Task, Expert } from '@/types';

const now = new Date();
const day = 24 * 60 * 60 * 1000;

export const EXPERTS: Expert[] = [
  {
    id: 'e1',
    userId: 'u2',
    name: '张大龙',
    title: '资深内容运营专家',
    description: '前头部 MCN 机构运营总监，擅长爆款内容拆解与流量增长。',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zhang',
    specialties: ['短视频', '账号分析', '内容创作'],
    rating: 4.9,
    solutionsCount: 5,
  },
  {
    id: 'e2',
    userId: 'u3',
    name: '李工',
    title: '高级系统架构师',
    description: '15 年软件开发经验，精通企业级文档自动化与 AI 客服集成。',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Li',
    specialties: ['文档自动化', 'AI 客服', '项目预警'],
    rating: 4.8,
    solutionsCount: 8,
  },
  {
    id: 'e3',
    userId: 'u4',
    name: '王经理',
    title: '营销策略专家',
    description: '擅长跨境电商与境内电商的全套营销物料生成与方案制定。',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wang',
    specialties: ['电商营销', '物料生成', '策略制定'],
    rating: 4.7,
    solutionsCount: 10,
  },
  {
    id: 'e4',
    userId: 'u5',
    name: '赵老师',
    title: '职业发展教练',
    description: '帮助 1000+ 职场人实现升职加薪，精通简历优化与面试辅导。',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zhao',
    specialties: ['简历优化', '面试辅导', '职场规划'],
    rating: 4.9,
    solutionsCount: 6,
  },
];

export const SOLUTIONS: Solution[] = [
  {
    id: 's_cat_litter',
    expertId: 'e1',
    title: '宠物猫砂小红书营销文案',
    description:
      '围绕产品卖点与小红书调性，生成种草笔记、话题标题与发布节奏建议，适合新品冷启动。',
    price: 199,
    paymentType: 'per-use',
    tags: ['内容从业者', '小红书', '营销'],
    version: 'v1.0.0',
    status: 'active',
    features: ['卖点提炼', '种草文案', '话题与标题'],
    steps: [
      { id: 'st1', title: '提炼猫砂核心卖点与目标人群', status: 'completed' },
      { id: 'st2', title: '生成3~5篇不同风格的种草文案', status: 'running' },
      { id: 'st3', title: '输出话题标签与标题备选', status: 'pending' },
    ],
  },
  {
    id: 's1',
    expertId: 'e1',
    title: '爆款内容制作方案',
    description: '基于大数据分析，提供高点赞数内容的创作模板与脚本建议。',
    price: 199,
    paymentType: 'per-use',
    tags: ['内容从业者', '爆款', '短视频'],
    version: 'v1.0.0',
    status: 'active',
    features: ['热点趋势分析', '脚本自动生成', '互动率预测'],
    steps: [
      { id: 'st1', title: '分析当前热点趋势', status: 'completed' },
      { id: 'st2', title: '生成 5 个创意脚本', status: 'running' },
      { id: 'st3', title: '优化互动话术', status: 'pending' },
    ],
  },
  {
    id: 's2',
    expertId: 'e1',
    title: '账号数据分析与提升方案',
    description: '深度诊断账号现状，提供多维度的粉丝增长与转化提升策略。',
    price: 499,
    paymentType: 'one-time',
    tags: ['内容从业者', '数据分析', '增长'],
    version: 'v1.1.0',
    status: 'active',
    features: ['粉丝画像分析', '内容表现诊断', '竞品对标报告'],
  },
  {
    id: 's3',
    expertId: 'e2',
    title: '会议录音转项目需求文档',
    description: '智能识别会议重点，自动生成标准格式的项目需求说明书（PRD）。',
    price: 99,
    paymentType: 'per-use',
    tags: ['软件开发', '需求分析', '效率'],
    version: 'v2.0.0',
    status: 'active',
    features: ['多语种识别', '关键点提取', '标准模板导出'],
  },
  {
    id: 's4',
    expertId: 'e2',
    title: '系统验收文档自动生成',
    description: '遵循行业标准格式，快速编写验收用的各类技术与管理文档。',
    price: 299,
    paymentType: 'one-time',
    tags: ['软件开发', '验收', '文档'],
    version: 'v1.0.0',
    status: 'active',
    features: ['格式自动对齐', '内容智能填充', '多版本管理'],
  },
  {
    id: 's8',
    expertId: 'e4',
    title: '高通过率简历生成器',
    description: '针对目标岗位精准匹配关键词，大幅提升简历通过率。',
    price: 49,
    paymentType: 'per-use',
    tags: ['打工人', '求职', '简历'],
    version: 'v1.0.0',
    status: 'active',
    features: ['JD 深度解析', '经历智能润色', '排版一键优化'],
    steps: [
      { id: 'st1', title: '解析目标岗位 JD', status: 'completed' },
      { id: 'st2', title: '提取核心关键词', status: 'completed' },
      { id: 'st3', title: '智能润色工作经历', status: 'running' },
      { id: 'st4', title: '一键优化排版布局', status: 'pending' },
    ],
  },
];

export const DAILY_DOCS_TASK_ID = 't_daily_docs';

export const TASKS: Task[] = [
  {
    id: DAILY_DOCS_TASK_ID,
    userId: 'u1',
    title: 'AI 每日总结',
    description: '用户与 AI 每日对话的结构化总结、任务执行洞察日报',
    status: 'completed',
    progress: 100,
    createdAt: new Date(now.getTime() - 1 * day),
    updatedAt: now,
    parameters: {},
    artifacts: [
      {
        id: 'ad1',
        type: 'file',
        title: '每日对话总结.md',
        url: '/daily/chat-summary.md',
      },
      {
        id: 'ad2',
        type: 'file',
        title: '任务执行日报.md',
        url: '/daily/task-insight-daily.md',
      },
    ],
    executionSteps: [],
  },
  {
    id: 't1',
    userId: 'u1',
    title: '老板助手',
    description: '协助处理各类日常办公任务',
    status: 'in-progress',
    progress: 65,
    createdAt: now,
    updatedAt: now,
    parameters: {},
    artifacts: [
      {
        id: 'a1',
        type: 'file',
        title: '2024年度预算草案.pdf',
        url: '/docs/budget-2024.pdf',
      },
      {
        id: 'a2',
        type: 'link',
        title: '项目进度看板',
        url: 'https://linear.app/project',
      },
      {
        id: 'a1b',
        type: 'file',
        title: '周报汇总.xlsx',
        url: '/docs/weekly-summary.xlsx',
      },
    ],
    triggerUserPrompt: '帮我整理下本周各部门的预算使用情况和周报',
    executionSteps: [
      { id: 't1-s1', title: '汇总各部门预算数据', status: 'completed' },
      { id: 't1-s2', title: '生成预算草案与周报', status: 'running' },
      { id: 't1-s3', title: '输出可分享链接', status: 'pending' },
    ],
  },
  {
    id: 't2',
    userId: 'u1',
    title: '爆款视频脚本生成',
    description: '针对「AI 办公」主题生成 5 个高转化短视频脚本。',
    status: 'completed',
    progress: 100,
    solutionId: 's1',
    createdAt: new Date(now.getTime() - 2 * day),
    updatedAt: new Date(now.getTime() - 2 * day),
    parameters: {},
    artifacts: [
      {
        id: 'a3',
        type: 'text',
        title: '脚本初稿摘要',
        content:
          '1. 开场：AI 改变生活的 3 个瞬间\n2. 中段：演示自动化流程\n3. 结尾：呼吁关注',
      },
      {
        id: 'a3f',
        type: 'file',
        title: '脚本分镜稿.docx',
        url: '/output/scripts.docx',
      },
    ],
    triggerUserPrompt: '帮我用爆款内容方案做 5 个 AI 办公主题的短视频脚本',
    executionSteps: [
      { id: 'st1', title: '分析当前热点趋势', status: 'completed' },
      { id: 'st2', title: '生成 5 个创意脚本', status: 'completed' },
      { id: 'st3', title: '优化互动话术', status: 'completed' },
    ],
  },
  {
    id: 't3',
    userId: 'u1',
    title: '跨境电商物料翻译',
    description: '将 20 个产品的详情页从中文翻译为英文和德文。',
    status: 'completed',
    progress: 100,
    solutionId: 's1',
    createdAt: new Date(now.getTime() - 2 * day),
    updatedAt: new Date(now.getTime() - 2 * day),
    parameters: {},
    artifacts: [
      {
        id: 'a4',
        type: 'file',
        title: '产品详情_EN.xlsx',
        url: '/export/products-en.xlsx',
      },
      {
        id: 'a5',
        type: 'file',
        title: '产品详情_DE.xlsx',
        url: '/export/products-de.xlsx',
      },
    ],
    triggerUserPrompt:
      '把这批 20 个产品详情页翻成英文和德文，要符合当地表达习惯',
    executionSteps: [
      { id: 't3-s1', title: '解析原文与术语库', status: 'completed' },
      { id: 't3-s2', title: '批量翻译与校对', status: 'completed' },
      { id: 't3-s3', title: '导出多语言表格', status: 'completed' },
    ],
  },
  {
    id: 't3b',
    userId: 'u1',
    title: '账号健康度诊断报告',
    description: '对主账号进行粉丝画像、内容表现与竞品对标分析，输出提升建议。',
    status: 'completed',
    progress: 100,
    solutionId: 's2',
    createdAt: new Date(now.getTime() - 7 * day),
    updatedAt: new Date(now.getTime() - 6 * day),
    parameters: {},
    artifacts: [
      {
        id: 'ac3',
        type: 'file',
        title: '账号诊断报告_主账号.pdf',
        url: '/reports/account-diagnosis.pdf',
      },
      {
        id: 'ac4',
        type: 'file',
        title: '竞品对标数据.xlsx',
        url: '/reports/competitor-benchmark.xlsx',
      },
    ],
    triggerUserPrompt: '帮我诊断一下主账号，看下粉丝画像和内容表现',
    executionSteps: [
      { id: 'c2-s1', title: '粉丝画像分析', status: 'completed' },
      { id: 'c2-s2', title: '内容表现诊断', status: 'completed' },
      { id: 'c2-s3', title: '竞品对标报告', status: 'completed' },
    ],
  },
];

export function useMockData() {
  return {
    experts: EXPERTS,
    solutions: SOLUTIONS,
  };
}


export function useMockData() {
  return {
    solutions: SOLUTIONS,
    tasks: TASKS,
    experts: EXPERTS,
  };
}
