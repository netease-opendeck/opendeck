import { onMounted, defineComponent, ref, computed } from 'vue';
import { Package } from 'lucide-vue-next';
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
          <header class="px-6 py-5 bg-white border-b border-slate-100">
            <div class="max-w-6xl mx-auto">
              <div class="flex items-center gap-6 flex-wrap">
                <h2 class="text-lg font-bold text-slate-800 flex items-center gap-2 shrink-0">
                  <Package class="text-indigo-500" size={20} /> 技能
                </h2>
              </div>
            </div>
          </header>

          <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div class="max-w-6xl mx-auto">
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
                <div class="text-sm text-slate-500">技能加载中...</div>
              )}
              {!loading.value && loadError.value && (
                <div class="text-sm text-red-600">
                  {loadError.value.type === 'unavailable' ||
                  loadError.value.type === 'network'
                    ? '技能服务暂不可用，请稍后重试。'
                    : '暂无可用技能。'}
                </div>
              )}
              {!loading.value &&
                !loadError.value &&
                skills.value.length === 0 && (
                  <div class="text-sm text-slate-500">暂无可用技能。</div>
                )}
              {!loading.value &&
                !loadError.value &&
                skills.value.length > 0 && (
                  <div class="space-y-6">
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {skills.value.map((skill) => (
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
