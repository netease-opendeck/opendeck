import { defineComponent } from 'vue';
import { Package, HardDrive, ClipboardList } from 'lucide-vue-next';

const menuItems = [
  { id: 'solutions', label: '技能', icon: Package },
  { id: 'drive', label: '文件', icon: HardDrive },
  { id: 'taskManagement', label: '历史任务', icon: ClipboardList },
];

export default defineComponent({
  name: 'Sidebar',
  props: {
    activeTab: { type: String, required: true },
  },
  emits: ['tab-change'],
  setup(props, { emit }) {
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
                title={item.label}
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
      </div>
    );
  },
});
