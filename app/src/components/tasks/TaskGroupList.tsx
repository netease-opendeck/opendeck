import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import { CheckCircle2, AlertCircle } from 'lucide-vue-next';
import type { TaskHistoryItem } from '@/types';

interface TimeGroupItem {
  timeLabel: string;
  tasks: TaskHistoryItem[];
}

export default defineComponent({
  name: 'TaskGroupList',
  props: {
    groups: { type: Array as () => TimeGroupItem[], required: true },
    onTaskClick: {
      type: Function as () => (task: TaskHistoryItem) => void,
      default: undefined,
    },
  },
  setup(props) {
    const { t, locale } = useI18n();
    const dateLocale = () => (locale.value === 'zh' ? 'zh-CN' : 'en-US');
    return () => (
      <ul class="space-y-8">
        {props.groups.map(({ timeLabel, tasks: groupTasks }) => (
          <li key={timeLabel}>
            <h3 class="text-sm font-black text-slate-500 uppercase tracking-widest mb-3">
              {timeLabel}
            </h3>
            <ul class="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {groupTasks.map((task) => {
                const isFailed = task.error !== null;
                const timeLabelSource = task.endedAt ?? task.startedAt;
                return (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => props.onTaskClick?.(task)}
                      class="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50/80 transition-colors"
                    >
                      <div class="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                        <p class="font-bold text-slate-900 truncate">
                          {task.taskName ?? task.skillName ?? t('task.unnamed')}
                        </p>
                      </div>
                      {timeLabelSource && (
                        <span class="text-[11px] text-slate-400 shrink-0 whitespace-nowrap">
                          {t('task.completedAt')}{' '}
                          {new Date(timeLabelSource).toLocaleString(dateLocale(), {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      )}
                      <span class="flex-shrink-0" aria-hidden>
                        {!isFailed ? (
                          <CheckCircle2
                            size={18}
                            class="text-green-500 opacity-90"
                          />
                        ) : (
                          <AlertCircle
                            size={18}
                            class="text-red-500 opacity-90"
                          />
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    );
  },
});
