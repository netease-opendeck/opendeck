import { defineComponent, ref } from 'vue';
import { X } from 'lucide-vue-next';

export default defineComponent({
  name: 'CreateSolutionModal',
  props: {
    onClose: { type: Function as () => () => void, required: true },
    onSubmit: {
      type: Function as () => (name: string, desc: string) => void,
      default: undefined,
    },
  },
  setup(props) {
    const name = ref('');
    const desc = ref('');

    const handleSubmit = (e: Event) => {
      e.preventDefault();
      if (name.value.trim()) {
        props.onSubmit?.(name.value.trim(), desc.value.trim());
        props.onClose();
      }
    };

    return () => (
      <div
        class="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6"
        onClick={props.onClose}
      >
        <div
          class="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
          onClick={(e: Event) => e.stopPropagation()}
        >
          <header class="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 class="text-lg font-black text-slate-900">创建新方案</h2>
            <button
              type="button"
              onClick={props.onClose}
              class="p-2 hover:bg-slate-100 rounded-xl text-slate-400"
            >
              <X size={20} />
            </button>
          </header>
          <form onSubmit={handleSubmit} class="p-6 space-y-4">
            <div>
              <label
                for="create-solution-name"
                class="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2"
              >
                方案名称
              </label>
              <input
                id="create-solution-name"
                value={name.value}
                onInput={(e: Event) => {
                  name.value = (e.target as HTMLInputElement).value;
                }}
                type="text"
                placeholder="例如：活动策划模板"
                class="w-full border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            <div>
              <label
                for="create-solution-desc"
                class="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2"
              >
                简要描述
              </label>
              <textarea
                id="create-solution-desc"
                value={desc.value}
                onInput={(e: Event) => {
                  desc.value = (e.target as HTMLTextAreaElement).value;
                }}
                placeholder="描述方案用途与适用场景"
                rows={3}
                class="w-full border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
              />
            </div>
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                onClick={props.onClose}
                class="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!name.value.trim()}
                class="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-50"
              >
                确定
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  },
});
