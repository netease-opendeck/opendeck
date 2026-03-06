import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import { X, File, CheckCircle2, AlertCircle } from 'lucide-vue-next';
import type { TaskHistoryItem, TaskArtifact } from '@/types';

export default defineComponent({
  name: 'ExecutionDetailSidebar',
  props: {
    task: { type: Object as () => TaskHistoryItem, required: true },
    onClose: { type: Function as () => () => void, required: true },
  },
  setup(props) {
    const { t, locale } = useI18n();
    const dateLocale = () => (locale.value === 'zh' ? 'zh-CN' : 'en-US');

    const displayTitle = () =>
      props.task.taskName ?? props.task.skillName ?? t('task.unnamed');

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
                <span>{t('task.created')} {createdAtLabel()}</span>
              )}
              {endedAtLabel() && <span>{t('task.ended')} {endedAtLabel()}</span>}
              {durationLabel() && <span>{t('task.duration')} {durationLabel()}</span>}
            </div>
          </div>
          <div class="flex-1 overflow-y-auto min-h-0">
            {props.task.detail && (
              <section class="p-4 border-b border-slate-100">
                <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                  {t('task.detail')}
                </h4>
                <p class="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {props.task.detail}
                </p>
              </section>
            )}

            {props.task.messages && props.task.messages.length > 0 && (
              <section class="p-4 border-b border-slate-100">
                <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                  {t('task.messages')}
                </h4>
                <ul class="space-y-3">
                  {props.task.messages.map((msg, idx) => (
                    <li key={idx} class="text-xs">
                      <p class="font-medium text-slate-600 mb-0.5">
                        {msg.role === 'user' ? t('task.user') : t('task.assistant')}：
                      </p>
                      <p class="text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                      {msg.timestamp && (
                        <p class="text-[10px] text-slate-400 mt-1">
                          {new Date(msg.timestamp).toLocaleString(dateLocale(), {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
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
    };
  },
});
