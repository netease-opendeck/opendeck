import { onMounted, defineComponent, ref, computed } from 'vue';
import { Package, Search, CheckCircle, XCircle, Archive } from 'lucide-vue-next';
import { fetchSkills } from '@/composables/useSkillsApi';
import SolutionCard from '@/components/solutions/SolutionCard';
import SolutionDetail from '@/components/solutions/SolutionDetail';
import type {
  Expert,
  SkillApiError,
  SkillDetail,
  SkillListItem,
} from '@/types';

const DUMMY_EXPERT_FOR_MINE: Expert = {
  id: 'me',
  userId: 'me',
  name: '我',
  title: '方案创建者',
  description: '我创建的方案',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=me',
  specialties: [],
  rating: 0,
  solutionsCount: 0,
};

export default defineComponent({
  name: 'SolutionsView',
  setup() {
    const experts: Expert[] = [DUMMY_EXPERT_FOR_MINE];
    const skills = ref<SkillListItem[]>([]);
    const search = ref('');
    const loading = ref(true);
    const loadError = ref<SkillApiError | null>(null);
    const selectedSlug = ref<string | null>(null);
    const detail = ref<SkillDetail | null>(null);
    const detailLoading = ref(false);
    const detailError = ref<SkillApiError | null>(null);
    const toastMessage = ref<string | null>(null);
    const toastType = ref<'error' | 'info'>('info');

    const showToast = (message: string, type: 'error' | 'info' = 'info') => {
      toastMessage.value = message;
      toastType.value = type;
    };

    const clearToast = () => {
      toastMessage.value = null;
    };

    const loadSkills = async () => {
      loading.value = true;
      loadError.value = null;
      try {
        skills.value = await fetchSkills();
      } catch (error) {
        loadError.value = error as SkillApiError;
        skills.value = [];
        showToast(
          loadError.value.message ||
            '技能列表加载失败，请稍后重试。',
          'error',
        );
      } finally {
        loading.value = false;
      }
    };

    const loadSkillDetail = async (slug: string) => {
      detailLoading.value = true;
      detailError.value = null;
      detail.value = null;
      try {
        const { fetchSkillDetail } = await import(
          '@/composables/useSkillsApi'
        );
        detail.value = await fetchSkillDetail(slug);
      } catch (error) {
        detailError.value = error as SkillApiError;
        const message =
          detailError.value.type === 'not_found'
            ? '技能不存在或已禁用。'
            : '技能详情加载失败，请稍后重试。';
        showToast(message, 'error');
      } finally {
        detailLoading.value = false;
      }
    };

    onMounted(() => {
      void loadSkills();
    });

    const skillStats = computed(() => ({
      total: skills.value.length,
      enabled: skills.value.filter((s) => s.status === 'enabled').length,
      disabled: skills.value.filter((s) => s.status === 'disabled').length,
    }));

    const filteredSkills = computed(() => {
      const q = search.value.trim().toLowerCase();
      if (!q) return skills.value;
      return skills.value.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      );
    });

    const selectedSolution = computed(() => detail.value);

    const selectedExpert = computed(() => {
      if (!selectedSolution.value) return null;
      if (selectedSlug.value) return DUMMY_EXPERT_FOR_MINE;
      return (
        experts.find((e) => e.id === selectedSolution.value!.expertId) ?? null
      );
    });

    return () => {
      if (selectedSolution.value && selectedExpert.value) {
        return (
          <SolutionDetail
            solution={selectedSolution.value}
            expert={selectedExpert.value}
            myStats={null}
            onBack={() => {
              selectedSlug.value = null;
              detail.value = null;
              detailError.value = null;
            }}
            asModal
          />
        );
      }

      return (
        <div class="flex-1 flex flex-col bg-slate-50/50 overflow-hidden">
          <header class="p-6 md:p-8 bg-white border-b border-slate-200 flex-shrink-0">
            <div class="max-w-4xl mx-auto space-y-4">
              <h2 class="text-2xl font-black text-slate-900 flex items-center gap-3">
                <Package class="text-indigo-600 size-5 opacity-90" /> 技能
              </h2>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100/80 shadow-sm">
                  <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 shrink-0">
                    <Archive size={22} strokeWidth={2} />
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-semibold text-indigo-600/90 uppercase tracking-wider">
                      全部技能
                    </p>
                    <p class="text-2xl font-black text-slate-900 tabular-nums mt-0.5">
                      {skillStats.value.total}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100/80 shadow-sm">
                  <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
                    <CheckCircle size={22} strokeWidth={2} />
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-semibold text-emerald-600/90 uppercase tracking-wider">
                      已启用
                    </p>
                    <p class="text-2xl font-black text-slate-900 tabular-nums mt-0.5">
                      {skillStats.value.enabled}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200/80 shadow-sm">
                  <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 text-slate-600 shrink-0">
                    <XCircle size={22} strokeWidth={2} />
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      已禁用
                    </p>
                    <p class="text-2xl font-black text-slate-900 tabular-nums mt-0.5">
                      {skillStats.value.disabled}
                    </p>
                  </div>
                </div>
              </div>
              <div class="w-full">
                <div class="relative flex-1">
                  <Search
                    class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={20}
                  />
                  <input
                    type="text"
                    placeholder="搜索技能名称或描述..."
                    value={search.value}
                    onInput={(e: Event) => {
                      search.value = (e.target as HTMLInputElement).value;
                    }}
                    class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
                  />
                </div>
              </div>
            </div>
          </header>

          <div class="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
            <div class="max-w-4xl mx-auto">
              {toastMessage.value && (
                <div
                  class={`mb-4 rounded-lg px-4 py-2 text-sm ${
                    toastType.value === 'error'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-slate-50 text-slate-700'
                  }`}
                >
                  <div class="flex items-center justify-between gap-4">
                    <span>{toastMessage.value}</span>
                    <button
                      type="button"
                      class="text-xs text-slate-400 hover:text-slate-600"
                      onClick={clearToast}
                    >
                      关闭
                    </button>
                  </div>
                </div>
              )}
              {loading.value && (
                <div class="py-16 text-center text-slate-400 text-sm font-medium">
                  技能加载中...
                </div>
              )}
              {!loading.value && loadError.value && (
                <div class="py-16 text-center text-red-500 text-sm font-medium">
                  {loadError.value.type === 'unavailable' ||
                  loadError.value.type === 'network'
                    ? '技能服务暂不可用，请稍后重试。'
                    : '暂无可用技能。'}
                </div>
              )}
              {!loading.value &&
                !loadError.value &&
                skills.value.length === 0 && (
                  <div class="py-16 text-center text-slate-400 text-sm font-medium">
                    暂无可用技能。
                  </div>
                )}
              {!loading.value &&
                !loadError.value &&
                skills.value.length > 0 &&
                filteredSkills.value.length === 0 && (
                  <div class="py-12 text-center text-slate-400 text-sm">
                    未找到匹配的技能
                  </div>
                )}
              {!loading.value &&
                !loadError.value &&
                skills.value.length > 0 &&
                filteredSkills.value.length > 0 && (
                  <div class="space-y-6">
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filteredSkills.value.map((skill) => (
                        <SolutionCard
                          key={skill.slug}
                          mySolution={{
                            id: skill.slug,
                            name: skill.name,
                            description: skill.description,
                            status: skill.status,
                            revenue: 0,
                          }}
                          onCardClick={async () => {
                            selectedSlug.value = skill.slug;
                            await loadSkillDetail(skill.slug);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      );
    };
  },
});
