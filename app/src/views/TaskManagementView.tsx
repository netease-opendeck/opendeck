import { defineComponent, computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ClipboardList, Calendar, Archive } from 'lucide-vue-next';
import { getTimeGroupKey } from '@/utils/date';
import TaskGroupList from '@/components/tasks/TaskGroupList';
import ExecutionDetailSidebar from '@/components/tasks/ExecutionDetailSidebar';
import { VueDatePicker } from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { zhCN, enUS } from 'date-fns/locale';
import type {
  TaskHistoryApiError,
  TaskHistoryItem,
  TaskHistoryStats,
} from '@/types';
import { fetchTasks, fetchTaskStats } from '@/composables/useTasksApi';

export default defineComponent({
  name: 'TaskManagementView',
  setup() {
    const { t, locale } = useI18n();
    const tasks = ref<TaskHistoryItem[]>([]);
    const stats = ref<TaskHistoryStats | null>(null);
    const loading = ref(false);
    const statsLoading = ref(false);
    const error = ref<TaskHistoryApiError | null>(null);
    const statsError = ref<TaskHistoryApiError | null>(null);

    const selectedTask = ref<TaskHistoryItem | null>(null);
    const filterStart = ref<Date | null>(null);
    const filterEnd = ref<Date | null>(null);

    const taskStats = computed<TaskHistoryStats>(() => ({
      today: stats.value?.today ?? 0,
      thisWeek: stats.value?.thisWeek ?? 0,
      total: stats.value?.total ?? 0,
    }));

    const filteredTasks = computed(() => {
      if (!filterStart.value && !filterEnd.value) return tasks.value;

      let startTs = 0;
      if (filterStart.value) {
        const ms = filterStart.value.getTime();
        if (!Number.isNaN(ms)) {
          startTs = new Date(ms).setHours(0, 0, 0, 0);
        }
      }

      let endTs = Infinity;
      if (filterEnd.value) {
        const ms = filterEnd.value.getTime();
        if (!Number.isNaN(ms)) {
          endTs = new Date(ms).setHours(23, 59, 59, 999);
        }
      }

      return tasks.value.filter((t) => {
        const ts = t.endedAt ?? t.startedAt;
        if (!ts) return false;
        const tms = new Date(ts).getTime();
        return tms >= startTs && tms <= endTs;
      });
    });

    const groupsForList = computed(() => {
      void locale.value;
      const sorted = [...filteredTasks.value].sort((a, b) => {
        const ta = a.endedAt ?? a.startedAt ?? '';
        const tb = b.endedAt ?? b.startedAt ?? '';
        return new Date(tb).getTime() - new Date(ta).getTime();
      });
      const groups: Record<
        'today' | 'yesterday' | 'thisWeek' | 'earlier',
        TaskHistoryItem[]
      > = {
        today: [],
        yesterday: [],
        thisWeek: [],
        earlier: [],
      };
      sorted.forEach((t) => {
        const ts = t.endedAt ?? t.startedAt ?? '';
        const key = getTimeGroupKey(ts);
        groups[key].push(t);
      });
      return (['today', 'yesterday', 'thisWeek', 'earlier'] as const)
        .filter((key) => groups[key].length > 0)
        .map((key) => ({
          timeLabel: t(`common.${key}`),
          tasks: groups[key],
        }));
    });

    onMounted(async () => {
      loading.value = true;
      statsLoading.value = true;
      error.value = null;
      statsError.value = null;

      try {
        const [tasksResult, statsResult] = await Promise.allSettled([
          fetchTasks(),
          fetchTaskStats(),
        ]);

        if (tasksResult.status === 'fulfilled') {
          tasks.value = tasksResult.value;
        } else {
          const err = tasksResult.reason as TaskHistoryApiError;
          error.value = err;
        }

        if (statsResult.status === 'fulfilled') {
          stats.value = statsResult.value;
        } else {
          const err = statsResult.reason as TaskHistoryApiError;
          statsError.value = err;
        }
      } finally {
        loading.value = false;
        statsLoading.value = false;
      }
    });

    return () => (
      <div class="flex-1 flex flex-col bg-slate-50/50 overflow-hidden">
        <header class="p-6 md:p-8 bg-white border-b border-slate-200 flex-shrink-0">
          <div class="max-w-4xl mx-auto space-y-4">
            <h2 class="text-2xl font-black text-slate-900 flex items-center gap-3">
              <ClipboardList class="text-indigo-600 size-5 opacity-90" /> {t('task.title')}
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100/80 shadow-sm">
                <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 shrink-0">
                  <Calendar size={22} strokeWidth={2} />
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-semibold text-indigo-600/90 uppercase tracking-wider">
                    {t('task.today')}
                  </p>
                  <p class="text-2xl font-black text-slate-900 tabular-nums mt-0.5">
                    {taskStats.value.today}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200/80 shadow-sm">
                <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 text-slate-600 shrink-0">
                  <Calendar size={22} strokeWidth={2} />
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {t('task.thisWeek')}
                  </p>
                  <p class="text-2xl font-black text-slate-900 tabular-nums mt-0.5">
                    {taskStats.value.thisWeek}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-amber-50/80 to-white border border-amber-100/80 shadow-sm">
                <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                  <Archive size={22} strokeWidth={2} />
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-semibold text-amber-700/80 uppercase tracking-wider">
                    {t('task.total')}
                  </p>
                  <p class="text-2xl font-black text-slate-900 tabular-nums mt-0.5">
                    {taskStats.value.total}
                  </p>
                </div>
              </div>
            </div>
            {statsError.value && (
              <p class="text-[11px] text-amber-600 mt-2">
                {t('task.statsError')}：{statsError.value.message}
              </p>
            )}
            <div class="flex justify-end">
              <div class="inline-flex items-center gap-2 flex-nowrap">
                <span class="text-xs font-medium text-slate-500 whitespace-nowrap">
                  {t('task.dateFilter')}
                </span>
                <VueDatePicker
                  modelValue={filterStart.value}
                  format="yyyy/MM/dd"
                  enableTime={false}
                  autoApply
                  clearable={false}
                  locale={locale.value === 'zh' ? zhCN : enUS}
                  inputClass="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 w-[120px]"
                  placeholder={locale.value === 'zh' ? '年/月/日' : 'yyyy/mm/dd'}
                  {...{
                    'onUpdate:modelValue': (val: Date | null) => {
                      filterStart.value = val;
                    },
                  }}
                />
                <span class="text-slate-400">{t('task.to')}</span>
                <VueDatePicker
                  modelValue={filterEnd.value}
                  format="yyyy/MM/dd"
                  enableTime={false}
                  autoApply
                  clearable={false}
                  locale={locale.value === 'zh' ? zhCN : enUS}
                  inputClass="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 w-[120px]"
                  placeholder={locale.value === 'zh' ? '年/月/日' : 'yyyy/mm/dd'}
                  {...{
                    'onUpdate:modelValue': (val: Date | null) => {
                      filterEnd.value = val;
                    },
                  }}
                />
                {(filterStart.value || filterEnd.value) && (
                  <button
                    type="button"
                    onClick={() => {
                      filterStart.value = null;
                      filterEnd.value = null;
                    }}
                    class="text-xs font-medium text-slate-500 hover:text-indigo-600 whitespace-nowrap"
                  >
                    {t('task.clear')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>
        <div class="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <div class="max-w-4xl mx-auto">
            {loading.value ? (
              <div class="py-16 text-center text-slate-400 text-sm font-medium">
                {t('task.loading')}
              </div>
            ) : error.value ? (
              <div class="py-16 text-center text-red-500 text-sm font-medium">
                {t('task.error')}：{error.value.message}
              </div>
            ) : tasks.value.length === 0 ? (
              <div class="py-16 text-center text-slate-400 text-sm font-medium">
                {t('task.empty')}
              </div>
            ) : filteredTasks.value.length === 0 ? (
              <div class="py-12 text-center text-slate-400 text-sm">
                {t('task.noResults')}
              </div>
            ) : (
              <TaskGroupList
                groups={groupsForList.value}
                onTaskClick={(t) => {
                  selectedTask.value = t;
                }}
              />
            )}
          </div>
        </div>
        {selectedTask.value && (
          <div class="fixed inset-0 z-[100] flex">
            <div
              class="absolute inset-0 bg-black/40"
              onClick={() => {
                selectedTask.value = null;
              }}
              aria-hidden
            />
            <ExecutionDetailSidebar
              task={selectedTask.value}
              onClose={() => {
                selectedTask.value = null;
              }}
            />
          </div>
        )}
      </div>
    );
  },
});
