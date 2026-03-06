import { defineComponent, onMounted, ref } from 'vue';
import { X } from 'lucide-vue-next';
import { fetchFileContent } from '@/composables/useFilesApi';
import MarkdownView from '@/components/common/MarkdownView';
import type { FileItem, FileApiError } from '@/types';

function isMarkdown(file: FileItem): boolean {
  const lower = file.fileName.toLowerCase();
  return lower.endsWith('.md') || lower.endsWith('.markdown');
}

function isTextLike(file: FileItem): boolean {
  const lower = file.fileName.toLowerCase();
  return (
    isMarkdown(file) ||
    lower.endsWith('.txt') ||
    lower.endsWith('.json') ||
    lower.endsWith('.log')
  );
}

export default defineComponent({
  name: 'FileContentModal',
  props: {
    file: { type: Object as () => FileItem, required: true },
    onClose: { type: Function as () => () => void, required: true },
  },
  setup(props) {
    const loading = ref(false);
    const error = ref<FileApiError | null>(null);
    const content = ref('');

    const load = async () => {
      loading.value = true;
      error.value = null;
      content.value = '';
      try {
        content.value = await fetchFileContent(props.file.filePath);
      } catch (e) {
        error.value = e as FileApiError;
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      void load();
    });

    return () => {
      const markdown = isMarkdown(props.file);
      const textLike = isTextLike(props.file);

      return (
        <div class="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            class="absolute inset-0 bg-black/40"
            onClick={props.onClose}
            aria-hidden
          />
          <div class="relative bg-white rounded-2xl shadow-2xl max-h-[90vh] w-full max-w-3xl flex flex-col overflow-hidden">
            <header class="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0">
              <div class="min-w-0">
                <h3 class="text-sm font-bold text-slate-900 truncate">
                  {props.file.fileName}
                </h3>
                <p class="text-[11px] text-slate-400 mt-0.5 truncate">
                  {props.file.filePath}
                </p>
              </div>
              <button
                type="button"
                onClick={props.onClose}
                class="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="关闭"
              >
                <X size={18} />
              </button>
            </header>
            <div class="flex-1 overflow-y-auto custom-scrollbar p-5">
              {loading.value && (
                <div class="text-sm text-slate-400">内容加载中...</div>
              )}
              {!loading.value && error.value && (
                <div class="text-sm text-red-500">
                  文件内容获取失败：{error.value.message}
                </div>
              )}
              {!loading.value && !error.value && (
                <>
                  {markdown && (
                    <MarkdownView source={content.value} />
                  )}
                  {!markdown && textLike && (
                    <pre class="whitespace-pre-wrap text-xs text-slate-800 font-mono">
                      {content.value}
                    </pre>
                  )}
                  {!textLike && (
                    <div class="text-sm text-slate-500">
                      当前文件类型暂不支持在线预览，请在本地打开：
                      <span class="block mt-1 break-all text-xs text-slate-400">
                        {props.file.filePath}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      );
    };
  },
});

