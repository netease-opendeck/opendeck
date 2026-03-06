import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import { Package, ChevronRight } from 'lucide-vue-next';
import type { Solution, MySolutionItem } from '@/types';

export default defineComponent({
  name: 'SolutionCard',
  props: {
    solution: {
      type: Object as () => Solution | undefined,
      default: undefined,
    },
    mySolution: {
      type: Object as () => MySolutionItem | undefined,
      default: undefined,
    },
    onCardClick: { type: Function as () => () => void, required: true },
  },
  setup(props) {
    const { t } = useI18n();
    const title = () => props.mySolution?.name ?? props.solution?.title ?? '';
    const isMine = () => !!props.mySolution;
    const status = () => props.mySolution?.status;

    return () => (
      <div
        onClick={props.onCardClick}
        class="group bg-white p-3 rounded-xl border border-slate-200 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/30 transition-all cursor-pointer"
      >
        <div class="flex items-start justify-between mb-1.5">
          <div class="p-1.5 bg-indigo-50 rounded-lg text-indigo-600 group-hover:scale-105 transition-transform">
            <Package size={16} />
          </div>
          {isMine() && status() && (
            <span
              class={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                status() === 'enabled'
                  ? 'bg-green-50 text-green-600'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {status() === 'enabled' ? t('solutions.enabled') : t('solutions.disabled')}
            </span>
          )}
        </div>
        <h4 class="text-sm font-bold text-slate-900 mb-0.5 line-clamp-1">
          {title()}
        </h4>
        <p class="text-xs text-slate-500 mb-1.5 line-clamp-2">
          {props.mySolution
            ? (props.mySolution.description ?? t('solutions.mySkillDescription'))
            : props.solution?.description}
        </p>
        <div class="flex items-center justify-end pt-1">
          <ChevronRight
            size={12}
            class="text-slate-300 group-hover:text-indigo-600 flex-shrink-0"
          />
        </div>
      </div>
    );
  },
});
