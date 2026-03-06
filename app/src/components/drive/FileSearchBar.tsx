import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import { Search } from 'lucide-vue-next';

interface TypeOption {
  key: string;
  label: string;
}

export default defineComponent({
  name: 'FileSearchBar',
  props: {
    search: { type: String, default: '' },
    typeFilter: {
      type: String,
      default: 'all',
    },
    typeOptions: {
      type: Array as () => TypeOption[],
      default: () => [],
    },
  },
  emits: ['updateSearch', 'updateTypeFilter'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const defaultFilters = ['all', 'file', 'link', 'text'] as const;

    return () => {
      const options: TypeOption[] =
        props.typeOptions && props.typeOptions.length > 0
          ? props.typeOptions
          : defaultFilters.map((f) => ({
              key: f,
              label: t(`drive.filter${f.charAt(0).toUpperCase() + f.slice(1)}`),
            }));

      return (
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="relative flex-1">
            <Search
              class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="text"
              placeholder={t('drive.searchPlaceholder')}
              value={props.search}
              onInput={(e: Event) =>
                emit('updateSearch', (e.target as HTMLInputElement).value)
              }
              class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
            />
          </div>
          <select
            value={props.typeFilter}
            onChange={(e: Event) =>
              emit('updateTypeFilter', (e.target as HTMLSelectElement).value)
            }
            class="bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 min-w-[120px] mr-1"
          >
            {options.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    };
  },
});
