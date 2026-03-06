import { defineComponent, ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { setLocale } from '@/i18n';

export default defineComponent({
  name: 'LanguageSwitcher',
  setup() {
    const { locale } = useI18n();
    const open = ref(false);

    const toggle = () => {
      open.value = !open.value;
    };

    const select = (value: 'zh' | 'en') => {
      setLocale(value);
      open.value = false;
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.language-switcher')) return;
      open.value = false;
    };

    onMounted(() => {
      document.addEventListener('click', handleClickOutside);
    });
    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
    });

    return () => (
      <div class="language-switcher relative mt-auto pt-4">
        <button
          type="button"
          onClick={toggle}
          class="w-full flex items-center justify-center py-2.5 px-3 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition-all text-sm font-bold"
          aria-expanded={open.value}
          aria-haspopup="listbox"
          aria-label="Language"
        >
          {locale.value === 'zh' ? '中' : 'EN'}
        </button>
        {open.value && (
          <div
            class="absolute left-full top-0 ml-1 py-1 min-w-[100px] bg-[#1f1f1f] border border-white/10 rounded-xl shadow-xl z-50"
            role="listbox"
          >
            <button
              type="button"
              role="option"
              aria-selected={locale.value === 'zh'}
              onClick={() => select('zh')}
              class={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                locale.value === 'zh'
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              中文
            </button>
            <button
              type="button"
              role="option"
              aria-selected={locale.value === 'en'}
              onClick={() => select('en')}
              class={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                locale.value === 'en'
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              English
            </button>
          </div>
        )}
      </div>
    );
  },
});
