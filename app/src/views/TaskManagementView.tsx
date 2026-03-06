import { defineComponent, computed, onMounted, ref } from 'vue';
import { ClipboardList, Calendar, Archive } from 'lucide-vue-next';
import { getTimeGroupKey, TIME_GROUP_LABELS } from '@/utils/date';
import TaskGroupList from '@/components/tasks/TaskGroupList';
import ExecutionDetailSidebar from '@/components/tasks/ExecutionDetailSidebar';
import type {
  TaskHistoryApiError,
  TaskHistoryItem,
  TaskHistoryStats,
} from '@/types';
import { fetchTasks, fetchTaskStats } from '@/composables/useTasksApi';

export default defineComponent({
  name: 'TaskManagementView',
  setup() {
    const tasks = ref<TaskHistoryItem[]>([]);
    const stats = ref<TaskHistoryStats | null>(null);
    const loading = ref(false);
    const statsLoading = ref(false);
    const error = ref<TaskHistoryApiError | null>(null);
    const statsError = ref<TaskHistoryApiError | null>(null);

    const selectedTask = ref<TaskHistoryItem | null>(null);
    const filterStart = ref('');
    const filterEnd = ref('');

    const taskStats = computed<TaskHistoryStats>(() => ({
      today: stats.value?.today ?? 0,
      thisWeek: stats.value?.thisWeek ?? 0,
      total: stats.value?.total ?? 0,
    }));

    const filteredTasks = computed(() => {
      if (!filterStart.value && !filterEnd.value) return tasks.value;
      const startTs = filterStart.value
        ? new Date(filterStart.value).setHours(0, 0, 0, 0)
        : 0;
      const endTs = filterEnd.value
        ? new Date(filterEnd.value).setHours(23, 59, 59, 999)
        : Infinity;
      return tasks.value.filter((t) => {
        const ts = t.endedAt ?? t.startedAt;
        if (!ts) return false;
        const tms = new Date(ts).getTime();
        return tms >= startTs && tms <= endTs;
      });
    });

    const groupsForList = computed(() => {
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
          timeLabel: TIME_GROUP_LABELS[key],
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
              <ClipboardList class="text-indigo-600 size-5 opacity-90" /> 历史任务
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100/80 shadow-sm">
                <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 shrink-0">
                  <Calendar size={22} strokeWidth={2} />
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-semibold text-indigo-600/90 uppercase tracking-wider">
                    今日完成
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
                    本周完成
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
                    累计完成
                  </p>
                  <p class="text-2xl font-black text-slate-900 tabular-nums mt-0.5">
                    {taskStats.value.total}
                  </p>
                </div>
              </div>
            </div>
            {statsError.value && (
              <p class="text-[11px] text-amber-600 mt-2">
                任务统计暂不可用：{statsError.value.message}
              </p>
            )}
            <div class="flex flex-wrap items-center justify-end gap-3">
              <span class="text-xs font-medium text-slate-500">时间筛选</span>
              <input
                type="date"
                value={filterStart.value}
                onInput={(e: Event) => {
                  filterStart.value = (e.target as HTMLInputElement).value;
                }}
                class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
                title="开始日期"
              />
              <span class="text-slate-400">至</span>
              <input
                type="date"
                value={filterEnd.value}
                onInput={(e: Event) => {
                  filterEnd.value = (e.target as HTMLInputElement).value;
                }}
                class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
                title="结束日期"
              />
              {(filterStart.value || filterEnd.value) && (
                <button
                  type="button"
                  onClick={() => {
                    filterStart.value = '';
                    filterEnd.value = '';
                  }}
                  class="text-xs font-medium text-slate-500 hover:text-indigo-600"
                >
                  清除
                </button>
              )}
            </div>
          </div>
        </header>
        <div class="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <div class="max-w-4xl mx-auto">
            {loading.value ? (
              <div class="py-16 text-center text-slate-400 text-sm font-medium">
                正在加载任务历史...
              </div>
            ) : error.value ? (
              <div class="py-16 text-center text-red-500 text-sm font-medium">
                任务历史暂不可用：{error.value.message}
              </div>
            ) : tasks.value.length === 0 ? (
              <div class="py-16 text-center text-slate-400 text-sm font-medium">
                暂无已完成的任务，在工作台执行技能完成后会在此展示
              </div>
            ) : filteredTasks.value.length === 0 ? (
              <div class="py-12 text-center text-slate-400 text-sm">
                未找到该时间范围内的任务
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
