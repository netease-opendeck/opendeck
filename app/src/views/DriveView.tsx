import { defineComponent, ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  HardDrive,
  Calendar,
  Archive,
  TrendingUp,
  File,
  FileText,
  ExternalLink,
  Folder,
  FolderOpen,
  ChevronRight,
} from 'lucide-vue-next';
import { getTimeGroupKey } from '@/utils/date';
import FileSearchBar from '@/components/drive/FileSearchBar';
import { fetchFiles, fetchFileStats, fetchFileTree } from '@/composables/useFilesApi';
import FileContentModal from '@/components/drive/FileContentModal';
import type { FileApiError, FileItem, FileStats, FileTreeNode } from '@/types';

function inferFileType(filePath: string): 'file' | 'link' | 'text' {
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return 'link';
  }
  const lower = filePath.toLowerCase();
  if (
    lower.endsWith('.md') ||
    lower.endsWith('.markdown') ||
    lower.endsWith('.txt') ||
    lower.endsWith('.json') ||
    lower.endsWith('.log')
  ) {
    return 'text';
  }
  return 'file';
}

function getIcon(type: 'file' | 'link' | 'text') {
  if (type === 'file') return File;
  if (type === 'link') return ExternalLink;
  return FileText;
}

export default defineComponent({
  name: 'DriveView',
  setup() {
    const { t, locale } = useI18n();
    const dateLocale = () => (locale.value === 'zh' ? 'zh-CN' : 'en-US');
    const search = ref('');
    const typeFilter = ref<'all' | 'file' | 'link' | 'text'>('all');
    const viewMode = ref<'time' | 'folder'>('time');
    const expandedFolderPaths = ref<Set<string>>(new Set());
    const files = ref<FileItem[]>([]);
    const fileTree = ref<FileTreeNode[]>([]);
    const stats = ref<FileStats | null>(null);
    const listLoading = ref(false);
    const treeLoading = ref(false);
    const statsLoading = ref(false);
    const listError = ref<FileApiError | null>(null);
    const statsError = ref<FileApiError | null>(null);
    const selectedFile = ref<FileItem | null>(null);

    const fileStats = computed<FileStats>(() => {
      if (!stats.value) {
        return { today: 0, thisWeek: 0, total: 0 };
      }
      return stats.value;
    });

    const loadFiles = async () => {
      listLoading.value = true;
      listError.value = null;
      try {
        files.value = await fetchFiles();
      } catch (error) {
        listError.value = error as FileApiError;
        files.value = [];
      } finally {
        listLoading.value = false;
      }
    };

    const loadFileTree = async () => {
      treeLoading.value = true;
      try {
        fileTree.value = await fetchFileTree();
      } catch {
        fileTree.value = [];
      } finally {
        treeLoading.value = false;
      }
    };

    const loadStats = async () => {
      statsLoading.value = true;
      statsError.value = null;
      try {
        stats.value = await fetchFileStats();
      } catch (error) {
        statsError.value = error as FileApiError;
        stats.value = null;
      } finally {
        statsLoading.value = false;
      }
    };

    onMounted(() => {
      void Promise.all([loadFiles(), loadStats(), loadFileTree()]);
    });

    const fileMatches = (file: FileItem) => {
      const q = search.value.trim().toLowerCase();
      const type = inferFileType(file.filePath);
      const matchesType =
        typeFilter.value === 'all' || typeFilter.value === type;
      const matchesSearch =
        !q ||
        file.fileName.toLowerCase().includes(q) ||
        file.skillName.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    };

    const filteredFiles = computed(() => {
      return files.value.filter((file) => fileMatches(file));
    });

    const filteredFileTree = computed(() => {
      // 无筛选时直接使用原始树，避免不必要的计算
      if (!search.value && typeFilter.value === 'all') {
        return fileTree.value;
      }
      return fileTree.value
        .map((node) => ({
          ...node,
          files: node.files.filter((file) => fileMatches(file)),
        }))
        .filter((node) => node.files.length > 0);
    });

    const groupedByTime = computed(() => {
      const groups: Record<
        'today' | 'yesterday' | 'thisWeek' | 'earlier',
        FileItem[]
      > = {
        today: [],
        yesterday: [],
        thisWeek: [],
        earlier: [],
      };
      const sorted = [...filteredFiles.value].sort((a, b) => {
        const aTs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTs - aTs;
      });
      sorted.forEach((f) => {
        const key = getTimeGroupKey(f.createdAt ?? new Date(0));
        groups[key].push(f);
      });
      return groups;
    });

    const hasFiles = computed(() => filteredFiles.value.length > 0);

    const toggleFolder = (path: string) => {
      const next = new Set(expandedFolderPaths.value);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      expandedFolderPaths.value = next;
    };

    const renderFolderNode = (node: FileTreeNode, depth: number) => {
      const paddingLeft = 32 + depth * 20;
      return (
        <>
          {node.files.map((file) => {
            const type = inferFileType(file.filePath);
            return (
              <li key={file.filePath}>
                <button
                  type="button"
                  onClick={() => {
                    selectedFile.value = file;
                  }}
                  class="w-full flex items-center gap-3 py-3 text-left hover:bg-slate-50/80 transition-colors"
                  style={{ paddingLeft: `${paddingLeft}px`, paddingRight: 32 }}
                >
                  <div class="flex-shrink-0 p-2 rounded-lg bg-white border border-slate-100 text-slate-500">
                    {(() => {
                      const Icon = getIcon(type);
                      return <Icon size={18} />;
                    })()}
                  </div>
                  <span class="flex-1 font-medium text-slate-800 truncate">
                    {file.fileName}
                  </span>
                  <span class="text-[11px] text-slate-400 shrink-0">
                    {file.createdAt
                      ? new Date(file.createdAt).toLocaleString(dateLocale(), {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </>
      );
    };

    return () => (
      <div class="flex-1 flex flex-col bg-slate-50/50 overflow-hidden">
        <header class="p-6 md:p-8 bg-white border-b border-slate-200 flex-shrink-0">
          <div class="max-w-4xl mx-auto space-y-4">
            <div class="flex items-center justify-between gap-4 flex-wrap">
              <h2 class="text-2xl font-black text-slate-900 flex items-center gap-3">
                <HardDrive class="text-indigo-600" /> {t('drive.title')}
              </h2>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100/80 shadow-sm">
                <div class="flex-shrink-0 w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <Calendar size={22} strokeWidth={2} />
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-semibold text-indigo-600/90 uppercase tracking-wider">
                    {t('drive.today')}
                  </p>
                  <p class="text-2xl font-black text-slate-900 tabular-nums mt-0.5">
                    {fileStats.value.today}
                    <span class="text-sm font-medium text-slate-500 ml-1">
                      {t('drive.unit')}
                    </span>
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-violet-50 to-white border border-violet-100/80 shadow-sm">
                <div class="flex-shrink-0 w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600">
                  <TrendingUp size={22} strokeWidth={2} />
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-semibold text-violet-600/90 uppercase tracking-wider">
                    {t('drive.thisWeek')}
                  </p>
                  <p class="text-2xl font-black text-slate-900 tabular-nums mt-0.5">
                    {fileStats.value.thisWeek}
                    <span class="text-sm font-medium text-slate-500 ml-1">
                      {t('drive.unit')}
                    </span>
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 shadow-sm">
                <div class="flex-shrink-0 w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                  <Archive size={22} strokeWidth={2} />
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {t('drive.allFiles')}
                  </p>
                  <p class="text-2xl font-black text-slate-900 tabular-nums mt-0.5">
                    {fileStats.value.total}
                    <span class="text-sm font-medium text-slate-500 ml-1">
                      {t('drive.unit')}
                    </span>
                  </p>
                </div>
              </div>
            </div>
            <div class="w-full flex items-center gap-3">
              <div class="flex-1">
                <FileSearchBar
                  search={search.value}
                  typeFilter={typeFilter.value}
                  onUpdateSearch={(v: string) => {
                    search.value = v;
                  }}
                  onUpdateTypeFilter={(v: 'all' | 'file' | 'link' | 'text') => {
                    typeFilter.value = v;
                  }}
                />
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <div class="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      viewMode.value = 'time';
                    }}
                    class={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                      viewMode.value === 'time'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t('drive.viewRecent')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      viewMode.value = 'folder';
                    }}
                    class={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                      viewMode.value === 'folder'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t('drive.viewManage')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div class="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <div class="max-w-4xl mx-auto space-y-8">
            {!listLoading.value && !hasFiles.value ? (
              <div class="py-16 text-center text-slate-400 text-sm font-medium">
                {search.value || typeFilter.value !== 'all'
                  ? t('drive.noMatch')
                  : t('drive.empty')}
              </div>
            ) : viewMode.value === 'time' ? (
              <ul class="space-y-6">
                {(['today', 'yesterday', 'thisWeek', 'earlier'] as const)
                  .filter((key) => groupedByTime.value[key].length > 0)
                  .map((key) => (
                    <li key={key}>
                      <h4 class="text-xs font-bold text-slate-400 mb-2">
                        {t(`common.${key}`)}
                      </h4>
                      <ul class="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                        {groupedByTime.value[key].map((file) => {
                          const type = inferFileType(file.filePath);
                          const Icon = getIcon(type);
                          return (
                            <li key={file.filePath}>
                              <button
                                type="button"
                                onClick={() => {
                                  selectedFile.value = file;
                                }}
                                class="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50/80 transition-colors"
                              >
                                <div class="flex-shrink-0 p-2 rounded-xl bg-slate-50 text-slate-500">
                                  <Icon size={20} />
                                </div>
                                <div class="flex-1 min-w-0">
                                  <p class="font-bold text-slate-900 truncate">
                                    {file.fileName}
                                  </p>
                                  <p class="text-xs text-slate-400 mt-0.5 truncate">
                                    {file.skillName}
                                  </p>
                                </div>
                                <span class="text-[11px] text-slate-400 shrink-0 whitespace-nowrap">
                                  {file.createdAt
                                    ? new Date(
                                        file.createdAt,
                                      ).toLocaleString(dateLocale(), {
                                        dateStyle: 'short',
                                        timeStyle: 'short',
                                      })
                                    : ''}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
              </ul>
            ) : (
              <ul class="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                {treeLoading.value || filteredFileTree.value.length === 0 ? (
                  <li class="py-8 text-center text-slate-400 text-sm">
                    {treeLoading.value ? t('drive.treeLoading') : t('drive.noFolder')}
                  </li>
                ) : (
                  filteredFileTree.value.map((node) => (
                    <li key={node.path}>
                      <button
                        type="button"
                        onClick={() => toggleFolder(node.path)}
                        class="w-full flex items-center gap-3 py-3.5 text-left hover:bg-slate-50/80 transition-colors"
                        style={{ paddingLeft: 20, paddingRight: 20 }}
                      >
                        {expandedFolderPaths.value.has(node.path) ? (
                          <FolderOpen
                            size={20}
                            class="text-amber-500 shrink-0"
                          />
                        ) : (
                          <Folder
                            size={20}
                            class="text-amber-500 shrink-0"
                          />
                        )}
                        <ChevronRight
                          size={16}
                          class={`shrink-0 text-slate-400 transition-transform ${
                            expandedFolderPaths.value.has(node.path)
                              ? 'rotate-90'
                              : ''
                          }`}
                        />
                        <span class="flex-1 font-medium text-slate-800 truncate">
                          {node.name || node.path}
                        </span>
                        <span class="text-[11px] text-slate-400 shrink-0">
                          {node.files.length} {t('drive.fileCount')}
                        </span>
                      </button>
                      {expandedFolderPaths.value.has(node.path) && (
                        <ul class="divide-y divide-slate-100">
                          {renderFolderNode(node, 1)}
                        </ul>
                      )}
                    </li>
                  ))
                )}
              </ul>
            )}
            {listLoading.value && (
              <div class="py-4 text-center text-slate-400 text-xs">
                {t('drive.listLoading')}
              </div>
            )}
            {statsError.value && (
              <div class="py-2 text-xs text-red-500">
                {t('drive.statsError')}：{statsError.value.message}
              </div>
            )}
            {listError.value && (
              <div class="py-2 text-xs text-red-500">
                {t('drive.listError')}：{listError.value.message}
              </div>
            )}
          </div>
        </div>
        {selectedFile.value && (
          <FileContentModal
            file={selectedFile.value}
            onClose={() => {
              selectedFile.value = null;
            }}
          />
        )}
      </div>
    );
  },
});
