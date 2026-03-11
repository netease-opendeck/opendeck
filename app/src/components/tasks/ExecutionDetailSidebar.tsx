import { defineComponent, nextTick, onMounted, onUpdated, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  X,
  File,
  CheckCircle2,
  AlertCircle,
  User,
  Sparkles,
  Terminal,
  ChevronRight,
  ChevronDown,
} from 'lucide-vue-next';
import MarkdownView from '@/components/common/MarkdownView';
import type { TaskHistoryItem, TaskArtifact } from '@/types';

interface ContentBlock {
  type?: string;
  text?: string;
  thinking?: string;
  name?: string;
  arguments?: unknown;
  [key: string]: unknown;
}

function asContentBlock(input: Record<string, unknown>): ContentBlock {
  return input as ContentBlock;
}

export default defineComponent({
  name: 'ExecutionDetailSidebar',
  props: {
    task: { type: Object as () => TaskHistoryItem, required: true },
    onClose: { type: Function as () => () => void, required: true },
  },
  setup(props) {
    const { t, locale } = useI18n();
    const resultMaxHeight = 120;
    const resultBodyRefs = ref<Record<number, HTMLElement | null>>({});
    const resultOverflowMap = ref<Record<number, boolean>>({});
    const resultExpandedMap = ref<Record<number, boolean>>({});
    const toolCallExpandedMap = ref<Record<string, boolean>>({});

    const dateLocale = () => (locale.value === 'zh' ? 'zh-CN' : 'en-US');

    const displayTitle = () =>
      props.task.taskName ??
      (props.task.skillNames && props.task.skillNames.length > 0
        ? props.task.skillNames[0]
        : t('task.unnamed'));

    const hasError = () => props.task.error !== null;

    const createdAtLabel = () => {
      if (!props.task.startedAt) return null;
      return new Date(props.task.startedAt).toLocaleString(dateLocale(), {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    };

    const endedAtLabel = () => {
      if (!props.task.endedAt) return null;
      return new Date(props.task.endedAt).toLocaleString(dateLocale(), {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    };

    const durationLabel = () => {
      if (!props.task.startedAt || !props.task.endedAt) return null;
      const start = new Date(props.task.startedAt).getTime();
      const end = new Date(props.task.endedAt).getTime();
      if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
      const minutes = Math.floor((end - start) / 60000);
      if (minutes < 60) return `${minutes} ${t('task.minutes')}`;
      const hours = Math.floor(minutes / 60);
      const rest = minutes % 60;
      return `${hours}h ${rest}min`;
    };

    const isUserRole = (role: string) => role === 'user';
    const isToolResultRole = (role: string) => role === 'toolResult';

    const roleLabel = (role: string) => {
      if (isUserRole(role)) return t('task.user');
      if (isToolResultRole(role)) return t('task.toolResult');
      return t('task.assistant');
    };

    const formatTimestamp = (timestamp: string | null) => timestamp;

    const syncOverflowState = () => {
      const nextOverflowMap: Record<number, boolean> = {};
      (props.task.childrenTasks ?? []).forEach((_, idx) => {
        const el = resultBodyRefs.value[idx];
        nextOverflowMap[idx] = !!el && el.scrollHeight > resultMaxHeight;
      });

      let overflowChanged =
        Object.keys(nextOverflowMap).length !==
        Object.keys(resultOverflowMap.value).length;
      if (!overflowChanged) {
        overflowChanged = Object.entries(nextOverflowMap).some(
          ([key, value]) => resultOverflowMap.value[Number(key)] !== value,
        );
      }
      if (overflowChanged) {
        resultOverflowMap.value = nextOverflowMap;
      }
    };

    const scheduleSyncOverflowState = () => {
      void nextTick(() => {
        syncOverflowState();
      });
    };

    const toggleResultExpanded = (idx: number) => {
      resultExpandedMap.value = {
        ...resultExpandedMap.value,
        [idx]: !resultExpandedMap.value[idx],
      };
    };

    const toolCallKey = (childIndex: number, blockIndex: number) =>
      `${childIndex}-${blockIndex}`;

    const isToolCallExpanded = (childIndex: number, blockIndex: number) =>
      !!toolCallExpandedMap.value[toolCallKey(childIndex, blockIndex)];

    const toggleToolCallExpanded = (childIndex: number, blockIndex: number) => {
      const key = toolCallKey(childIndex, blockIndex);
      toolCallExpandedMap.value = {
        ...toolCallExpandedMap.value,
        [key]: !toolCallExpandedMap.value[key],
      };
    };

    const formatUnknown = (value: unknown) => JSON.stringify(value, null, 2);

    const summarizeArguments = (argumentsValue: unknown) => {
      if (!argumentsValue || typeof argumentsValue !== 'object') return '';
      const entries = Object.entries(argumentsValue as Record<string, unknown>).slice(0, 3);
      return entries
        .map(([key, val]) => `${key}: ${typeof val === 'string' ? val : JSON.stringify(val)}`)
        .join(', ');
    };

    onMounted(() => {
      scheduleSyncOverflowState();
    });

    onUpdated(() => {
      scheduleSyncOverflowState();
    });

    return () => (
      <div
        class="fixed right-0 top-0 bottom-0 z-40 w-[500px] border-l border-slate-200 bg-white flex flex-col overflow-hidden shadow-2xl"
        role="dialog"
        aria-label={t('task.executionDetail')}
      >
        <div class="p-4 border-b border-slate-100 flex-shrink-0">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-sm font-bold text-slate-800 truncate">
                  {displayTitle()}
                </h3>
                <span
                  class={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                    hasError() ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                  }`}
                >
                  {hasError() ? t('task.failed') : t('task.completed')}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={props.onClose}
              class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 shrink-0"
              aria-label={t('task.close')}
            >
              <X size={18} />
            </button>
          </div>
          <div class="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500 pt-2 border-t border-slate-100 mt-3">
            {createdAtLabel() && (
              <span>
                {t('task.created')} {createdAtLabel()}
              </span>
            )}
            {endedAtLabel() && (
              <span>
                {t('task.ended')} {endedAtLabel()}
              </span>
            )}
            {durationLabel() && (
              <span>
                {t('task.duration')} {durationLabel()}
              </span>
            )}
          </div>
        </div>
        <div class="flex-1 overflow-y-auto min-h-0">
          <section class="p-4 border-b border-slate-100">
            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">
              {t('task.steps')}
            </h4>
            {props.task.childrenTasks && props.task.childrenTasks.length > 0 ? (
              <ul class="space-y-3">
                {props.task.childrenTasks.map((child, idx) => {
                  const isError = child.isError;
                  const isLast = idx === props.task.childrenTasks.length - 1;
                  return (
                    <li key={child.id} class="relative pl-7">
                      {!isLast && (
                        <span
                          class="absolute left-[11px] top-6 bottom-[-14px] w-px bg-slate-200"
                          aria-hidden
                        />
                      )}
                      <span
                        class={`absolute left-0 top-1 inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border ${
                          isError
                            ? 'border-red-200 bg-red-50 text-red-500'
                            : 'border-green-200 bg-green-50 text-green-500'
                        }`}
                        aria-hidden
                      >
                        {isError ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
                      </span>
                      <div class="rounded-xl border border-slate-200 bg-white p-3">
                        <div class="flex items-center justify-between gap-3">
                          <div class="flex items-center gap-2 text-xs text-slate-700 min-w-0">
                            <span class="inline-flex items-center gap-1 text-slate-500">
                              {isUserRole(child.role) ? (
                                <User size={12} />
                              ) : isToolResultRole(child.role) ? (
                                <Terminal size={12} />
                              ) : (
                                <Sparkles size={12} />
                              )}
                              {roleLabel(child.role)}
                            </span>
                          </div>
                          {formatTimestamp(child.timestamp) && (
                            <span class="text-[10px] text-slate-400 shrink-0">
                              {formatTimestamp(child.timestamp)}
                            </span>
                          )}
                        </div>

                        <div class="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                          <div class="relative">
                            <div
                              ref={(el) => {
                                resultBodyRefs.value[idx] = (el as HTMLElement | null) ?? null;
                              }}
                              class={
                                resultOverflowMap.value[idx] && !resultExpandedMap.value[idx]
                                  ? 'max-h-[120px] overflow-hidden'
                                  : ''
                              }
                            >
                              <ul class="space-y-2">
                                {(child.content ?? []).map((rawBlock, blockIndex) => {
                                  const block = asContentBlock(rawBlock);
                                  const blockType = block.type ?? 'unknown';

                                  if (blockType === 'text') {
                                    return (
                                      <li key={`${child.id}-text-${blockIndex}`} class="text-xs text-slate-700">
                                        <MarkdownView source={typeof block.text === 'string' ? block.text : ''} />
                                      </li>
                                    );
                                  }

                                  if (blockType === 'thinking') {
                                    return (
                                      <li key={`${child.id}-thinking-${blockIndex}`}>
                                        <div class="text-[10px] font-semibold uppercase text-slate-400 mb-1">
                                          Thinking
                                        </div>
                                        <div class="rounded border border-amber-100 bg-amber-50 p-2 text-xs text-slate-700">
                                          <MarkdownView source={typeof block.thinking === 'string' ? block.thinking : ''} />
                                        </div>
                                      </li>
                                    );
                                  }

                                  if (blockType === 'toolCall') {
                                    const expanded = isToolCallExpanded(idx, blockIndex);
                                    const summary = summarizeArguments(block.arguments);
                                    return (
                                      <li key={`${child.id}-toolCall-${blockIndex}`} class="rounded border border-slate-200 bg-white">
                                        <button
                                          type="button"
                                          class="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-left text-xs"
                                          onClick={() => toggleToolCallExpanded(idx, blockIndex)}
                                        >
                                          <span class="font-medium text-slate-700 truncate">
                                            {String(block.name ?? 'toolCall')}
                                            {summary ? ` (${summary})` : ''}
                                          </span>
                                          <span class="text-slate-400 shrink-0">
                                            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                          </span>
                                        </button>
                                        {expanded && (
                                          <pre class="border-t border-slate-100 p-2 text-[11px] text-slate-600 overflow-auto whitespace-pre-wrap break-words">
                                            {formatUnknown(block)}
                                          </pre>
                                        )}
                                      </li>
                                    );
                                  }

                                  if (blockType === 'toolResult') {
                                    return (
                                      <li key={`${child.id}-toolResult-${blockIndex}`} class="rounded border border-slate-200 bg-white p-2 text-xs text-slate-700">
                                        <pre class="whitespace-pre-wrap break-words">
                                          {formatUnknown(block)}
                                        </pre>
                                      </li>
                                    );
                                  }

                                  return (
                                    <li key={`${child.id}-unknown-${blockIndex}`} class="rounded border border-slate-200 bg-white p-2 text-xs text-slate-700">
                                      <pre class="whitespace-pre-wrap break-words">
                                        {formatUnknown(block)}
                                      </pre>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                            {resultOverflowMap.value[idx] && !resultExpandedMap.value[idx] && (
                              <div class="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-50 to-transparent" />
                            )}
                          </div>
                          {resultOverflowMap.value[idx] && (
                            <button
                              type="button"
                              class="mt-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
                              onClick={() => toggleResultExpanded(idx)}
                            >
                              {resultExpandedMap.value[idx] ? t('task.collapse') : t('task.expand')}
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div class="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-400">
                {t('task.noSteps')}
              </div>
            )}
          </section>

          {props.task.artifacts && props.task.artifacts.length > 0 && (
            <section class="p-4 border-b border-slate-100">
              <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                {t('task.files')}
              </h4>
              <ul class="space-y-2">
                {props.task.artifacts.map((art: TaskArtifact) => (
                  <li
                    key={art.absolutePath}
                    class="rounded-lg bg-slate-50 border border-slate-100 p-2.5 flex items-center gap-3"
                  >
                    <div class="p-2 rounded-lg bg-white border border-slate-100 text-slate-500 shrink-0">
                      <File size={18} />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-bold text-slate-700 truncate">
                        {art.fileName}
                      </p>
                      <p
                        class="text-[10px] text-slate-400 truncate mt-0.5"
                        title={art.absolutePath}
                      >
                        {art.absolutePath}
                      </p>
                      {art.fileSize != null && (
                        <p class="text-[10px] text-slate-400 mt-0.5">
                          {t('task.fileSize')}：{art.fileSize} {t('task.bytes')}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section class="p-4" />
        </div>
      </div>
    );
  },
});
