import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import { Package, HardDrive, ClipboardList } from 'lucide-vue-next';
import LanguageSwitcher from './LanguageSwitcher';

const menuItems = [
  { id: 'taskManagement', labelKey: 'sidebar.task' as const, icon: ClipboardList },
  { id: 'drive', labelKey: 'sidebar.drive' as const, icon: HardDrive },
  { id: 'solutions', labelKey: 'sidebar.solutions' as const, icon: Package },
];

export default defineComponent({
  name: 'Sidebar',
  props: {
    activeTab: { type: String, required: true },
  },
  emits: ['tab-change'],
  setup(props, { emit }) {
    const { t } = useI18n();
    return () => (
      <div class="w-16 h-full bg-[#141414] text-white flex flex-col items-center py-6 flex-shrink-0 border-r border-white/5">
        <nav class="flex-1 flex flex-col gap-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => emit('tab-change', item.id)}
                title={t(item.labelKey)}
                class={`p-3 rounded-xl transition-all ${
                  props.activeTab === item.id
                    ? 'bg-white/10 text-white shadow-inner'
                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={20} />
              </button>
            );
          })}
        </nav>
        <LanguageSwitcher />
      </div>
    );
  },
});
