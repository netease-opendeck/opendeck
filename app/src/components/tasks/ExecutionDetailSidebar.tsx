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
} from 'lucide-vue-next';
import MarkdownView from '@/components/common/MarkdownView';
import type { TaskHistoryItem, TaskArtifact } from '@/types';

export default defineComponent({
  name: 'ExecutionDetailSidebar',
  props: {
    task: { type: Object as () => TaskHistoryItem, required: true },
    onClose: { type: Function as () => () => void, required: true },
  },
  setup(props) {
    const { t, locale } = useI18n();
    const messageMaxHeight = 80;
    const messageBodyRefs = ref<Record<number, HTMLElement | null>>({});
    const messageOverflowMap = ref<Record<number, boolean>>({});
    const messageExpandedMap = ref<Record<number, boolean>>({});

    const syncMessageOverflowState = () => {
      const nextOverflowMap: Record<number, boolean> = {};
      (props.task.messages ?? []).forEach((_, idx) => {
        const el = messageBodyRefs.value[idx];
        nextOverflowMap[idx] = !!el && el.scrollHeight > messageMaxHeight;
      });

      let overflowChanged =
        Object.keys(nextOverflowMap).length !==
        Object.keys(messageOverflowMap.value).length;
      if (!overflowChanged) {
        overflowChanged = Object.entries(nextOverflowMap).some(
          ([key, value]) => messageOverflowMap.value[Number(key)] !== value,
        );
      }
      if (overflowChanged) {
        messageOverflowMap.value = nextOverflowMap;
      }

      let expandedChanged = false;
      const nextExpandedMap = { ...messageExpandedMap.value };
      Object.keys(nextExpandedMap).forEach((key) => {
        const idx = Number(key);
        if (!nextOverflowMap[idx]) {
          delete nextExpandedMap[idx];
          expandedChanged = true;
        }
      });
      if (expandedChanged) {
        messageExpandedMap.value = nextExpandedMap;
      }
    };

    const scheduleSyncMessageOverflowState = () => {
      void nextTick(() => {
        syncMessageOverflowState();
      });
    };

    const toggleMessageExpanded = (idx: number) => {
      messageExpandedMap.value = {
        ...messageExpandedMap.value,
        [idx]: !messageExpandedMap.value[idx],
      };
    };

    onMounted(() => {
      scheduleSyncMessageOverflowState();
    });

    onUpdated(() => {
      scheduleSyncMessageOverflowState();
    });

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

    const messageLayoutClass = (role: string) => {
      if (isUserRole(role)) return 'justify-end';
      return 'justify-start';
    };

    const messageBubbleClass = (role: string) => {
      if (isUserRole(role))
        return 'bg-blue-50 border-blue-100 text-slate-800 rounded-br-sm';
      if (isToolResultRole(role))
        return 'bg-slate-100 border-slate-200 text-slate-700 rounded-bl-sm';
      return 'bg-white border-slate-200 text-slate-800 rounded-bl-sm';
    };

    const messageMetaClass = (role: string) =>
      isUserRole(role) ? 'text-right' : 'text-left';

    const messageOverlayClass = (role: string) => {
      if (isUserRole(role)) return 'from-blue-50 to-transparent';
      if (isToolResultRole(role)) return 'from-slate-100 to-transparent';
      return 'from-white to-transparent';
    };

    return () => {
      return (
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
                      hasError()
                        ? 'bg-red-50 text-red-600'
                        : 'bg-green-50 text-green-600'
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
            {props.task.childrenTasks &&
              props.task.childrenTasks.length > 0 && (
                <section class="p-4 border-b border-slate-100">
                  <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                    {t('task.steps')}
                  </h4>
                  <ul class="space-y-2">
                    {props.task.childrenTasks.map((child) => {
                      const isError = child.error !== null;
                      const isCompleted =
                        !isError && child.status === 'completed';
                      const iconClass = isError
                        ? 'text-red-500'
                        : isCompleted
                          ? 'text-green-500'
                          : 'text-slate-400';
                      return (
                        <li
                          key={child.id}
                          class="flex items-center gap-2 text-xs text-slate-700"
                        >
                          <span class={`shrink-0 ${iconClass}`}>
                            {isError ? (
                              <AlertCircle size={14} />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}
                          </span>
                          <span class="truncate">
                            {child.name || t('task.unnamed')}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

            {props.task.messages && props.task.messages.length > 0 && (
              <section class="p-4 border-b border-slate-100">
                <div class="rounded-xl bg-slate-50 border border-slate-100 p-4">
                  <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-3">
                    {t('task.messages')}
                  </h4>
                  <ul class="space-y-3">
                    {props.task.messages.map((msg, idx) => {
                      const layoutClass = messageLayoutClass(msg.role);
                      const bubbleClass = messageBubbleClass(msg.role);
                      const metaClass = messageMetaClass(msg.role);
                      const overlayClass = messageOverlayClass(msg.role);

                      return (
                        <li key={idx} class={`text-xs flex ${layoutClass}`}>
                          <div
                            class={`w-full ${
                              isToolResultRole(msg.role) ? '' : 'max-w-[86%]'
                            }`}
                          >
                            <div
                              class={`rounded-lg border px-3 py-2 ${bubbleClass}`}
                            >
                              <div class="mb-1 flex items-center gap-1.5 text-slate-500">
                                <span
                                  class="relative inline-flex h-4 w-4 items-center justify-center group"
                                  aria-label={roleLabel(msg.role)}
                                >
                                  {isUserRole(msg.role) ? (
                                    <User size={13} />
                                  ) : isToolResultRole(msg.role) ? (
                                    <Terminal size={13} />
                                  ) : (
                                    <Sparkles size={13} />
                                  )}
                                  <span class="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-white opacity-0 shadow transition-opacity group-hover:opacity-100">
                                    {roleLabel(msg.role)}
                                  </span>
                                </span>
                              </div>
                              <div class="relative">
                                <div
                                  ref={(el) => {
                                    messageBodyRefs.value[idx] =
                                      (el as HTMLElement | null) ?? null;
                                  }}
                                  class={`${
                                    messageOverflowMap.value[idx] &&
                                    !messageExpandedMap.value[idx]
                                      ? 'max-h-[80px] overflow-hidden'
                                      : ''
                                  }`}
                                >
                                  <MarkdownView source={msg.content} />
                                </div>
                                {messageOverflowMap.value[idx] &&
                                  !messageExpandedMap.value[idx] && (
                                    <div
                                      class={`pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t ${overlayClass}`}
                                    />
                                  )}
                              </div>
                            </div>
                            {messageOverflowMap.value[idx] && (
                              <button
                                type="button"
                                class={`mt-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 ${metaClass}`}
                                onClick={() => toggleMessageExpanded(idx)}
                              >
                                {messageExpandedMap.value[idx]
                                  ? t('task.collapse')
                                  : t('task.expand')}
                              </button>
                            )}
                            {msg.timestamp && (
                              <p
                                class={`text-[10px] text-slate-400 mt-1 ${metaClass}`}
                              >
                                {new Date(msg.timestamp).toLocaleString(
                                  dateLocale(),
                                  {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                  },
                                )}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            )}

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
                            {t('task.fileSize')}：{art.fileSize}{' '}
                            {t('task.bytes')}
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
    };
  },
});
