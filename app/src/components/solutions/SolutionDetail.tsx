import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import { ChevronRight, Zap, X } from 'lucide-vue-next';
import type { Solution, Expert, MySolutionItem, SkillDetail } from '@/types';
import MarkdownView from '@/components/common/MarkdownView';

export default defineComponent({
  name: 'SolutionDetail',
  props: {
    solution: { type: Object as () => Solution | SkillDetail, required: true },
    expert: { type: Object as () => Expert, required: true },
    myStats: {
      type: Object as () => MySolutionItem | null | undefined,
      default: null,
    },
    onBack: { type: Function as () => () => void, required: true },
    onApply: {
      type: Function as () => (s: Solution) => void,
      default: undefined,
    },
    asModal: { type: Boolean, default: false },
  },
  setup(props) {
    const { t } = useI18n();
    const isMine = () => !!props.myStats;

    const displayName = () =>
      'name' in props.solution ? props.solution.name : props.solution.title;

    const displayStatus = (): 'enabled' | 'disabled' | null => {
      if ('status' in props.solution && props.solution.status) {
        return props.solution.status;
      }
      if (props.myStats?.status) return props.myStats.status;
      return null;
    };

    const content = () => (
      <div
        class={
          props.asModal
            ? 'max-w-2xl mx-auto w-full p-6 space-y-8'
            : 'max-w-4xl mx-auto w-full p-12 space-y-12'
        }
      >
        <div class="flex gap-6 items-start">
          <div
            class={`rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-200 flex-shrink-0 ${
              props.asModal ? 'w-16 h-16' : 'w-24 h-24'
            }`}
          >
            <Zap size={props.asModal ? 28 : 40} fill="white" />
          </div>
          <div class="flex-1 space-y-2 min-w-0">
            <div class="flex items-baseline gap-3 flex-wrap">
              <h2
                class={`font-black text-slate-900 tracking-tight ${
                  props.asModal ? 'text-2xl' : 'text-3xl'
                }`}
              >
                {displayName()}
              </h2>
              {displayStatus() && (
                <span
                  class={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    displayStatus() === 'enabled'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {displayStatus() === 'enabled' ? t('solutions.enabled') : t('solutions.disabled')}
                </span>
              )}
            </div>
            <p
              class={`text-slate-500 font-medium leading-relaxed ${
                props.asModal ? 'text-sm' : 'text-base'
              }`}
            >
              {props.solution.description}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-8">
          <div class="space-y-8">
            {'skillDoc' in props.solution &&
              props.solution.skillDoc != null &&
              props.solution.skillDoc !== '' && (
                <section class="space-y-3">
                  <h3 class="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
                    {t('solutions.title')}
                  </h3>
                  <div class="prose prose-slate max-w-none text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                    {props.solution.skillDoc}
                  </div>
                </section>
              )}
            {'doc' in props.solution &&
              props.solution.doc != null &&
              props.solution.doc !== '' && (
                <section class="space-y-3">
                  <h3 class="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
                    {t('solutions.title')}
                  </h3>
                  <MarkdownView source={props.solution.doc} />
                </section>
              )}
          </div>
        </div>
      </div>
    );

    return () => {
      if (props.asModal) {
        return (
          <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              class="absolute inset-0 bg-black/40"
              onClick={props.onBack}
              aria-hidden
            />
            <div class="relative bg-white rounded-2xl shadow-2xl max-h-[90vh] w-full max-w-2xl flex flex-col overflow-hidden">
              <header class="flex items-center justify-between p-4 border-b border-slate-100 flex-shrink-0">
                <h3 class="text-lg font-black text-slate-900 truncate">
                  {t('solutions.skillDetail')}
                </h3>
                <button
                  type="button"
                  onClick={props.onBack}
                  class="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label={t('common.close')}
                >
                  <X size={20} />
                </button>
              </header>
              <div class="flex-1 overflow-y-auto custom-scrollbar">
                {content()}
              </div>
            </div>
          </div>
        );
      }

      return (
        <div class="flex-1 flex flex-col bg-white overflow-y-auto custom-scrollbar">
          <header class="h-14 border-b border-slate-100 flex items-center px-8 bg-white flex-shrink-0 sticky top-0 z-10">
            <button
              type="button"
              onClick={props.onBack}
              class="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-all"
            >
              <ChevronRight size={18} class="rotate-180" />{' '}
              {isMine() ? t('solutions.backMySkills') : t('solutions.back')}
            </button>
          </header>
          {content()}
        </div>
      );
    };
  },
});
