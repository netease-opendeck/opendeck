import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  FileText,
  File,
  ExternalLink,
  MessageSquare,
  ChevronRight,
} from 'lucide-vue-next';
import type { Task, Artifact } from '@/types';

interface TaskWithArtifacts {
  task: Task;
  artifacts: Artifact[];
}

interface FlatFileEntry {
  task: Task;
  artifact: Artifact;
}

export default defineComponent({
  name: 'ArtifactList',
  props: {
    dailySummary: {
      type: Object as () => TaskWithArtifacts | null,
      default: null,
    },
    otherFiles: { type: Array as () => TaskWithArtifacts[], default: () => [] },
    flatSortedFiles: {
      type: Array as () => FlatFileEntry[],
      default: () => [],
    },
    onOpenTask: {
      type: Function as () => (taskId: string, artifact?: Artifact) => void,
      default: undefined,
    },
  },
  setup(props) {
    const { t } = useI18n();
    const getIcon = (type: Artifact['type']) => {
      if (type === 'file') return File;
      if (type === 'link') return ExternalLink;
      return FileText;
    };

    return () => (
      <div class="max-w-4xl mx-auto space-y-8">
        {props.dailySummary && (
          <section>
            <h3 class="text-sm font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <FileText size={14} class="text-indigo-500" />
              {t('artifact.dailySummary')}
            </h3>
            <p class="text-xs text-slate-400 mb-3">
              {t('artifact.dailySummaryDesc')}
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {props.dailySummary.artifacts.map((artifact) => {
                const isChatSummary = artifact.title.includes('对话总结');
                return (
                  <button
                    key={artifact.id}
                    type="button"
                    onClick={() =>
                      props.onOpenTask?.(props.dailySummary!.task.id, artifact)
                    }
                    class="flex items-start gap-4 p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/50 hover:border-indigo-200 hover:bg-indigo-50 transition-colors text-left group"
                  >
                    <div class="flex-shrink-0 p-3 rounded-xl bg-white border border-indigo-100 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                      <FileText size={24} />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="font-bold text-slate-900 truncate">
                        {artifact.title}
                      </p>
                      <p class="text-xs text-slate-500 mt-0.5">
                        {isChatSummary
                          ? t('artifact.chatSummaryDesc')
                          : t('artifact.taskInsightDesc')}
                      </p>
                    </div>
                    <ChevronRight
                      size={18}
                      class="flex-shrink-0 text-indigo-400 group-hover:text-indigo-600 transition-colors"
                    />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {(props.flatSortedFiles.length > 0 || props.otherFiles.length > 0) && (
          <section>
            <h3 class="text-sm font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <MessageSquare size={14} class="text-slate-400" />
              {t('artifact.sessionAndTask')}
            </h3>
            <ul class="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {props.flatSortedFiles.length > 0
                ? props.flatSortedFiles.map(({ task, artifact }) => {
                    const Icon = getIcon(artifact.type);
                    return (
                      <li key={`${task.id}-${artifact.id}`}>
                        <button
                          type="button"
                          onClick={() => props.onOpenTask?.(task.id, artifact)}
                          class="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50/80 active:bg-indigo-50/50 transition-colors group"
                        >
                          <div class="flex-shrink-0 p-2 rounded-xl bg-slate-50 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                            <Icon size={20} />
                          </div>
                          <div class="flex-1 min-w-0">
                            <p class="font-bold text-slate-900 truncate">
                              {artifact.title}
                            </p>
                            <p class="text-xs text-slate-400 mt-0.5 truncate">
                              {task.title}
                            </p>
                          </div>
                          <ChevronRight
                            size={18}
                            class="flex-shrink-0 text-slate-300 group-hover:text-indigo-500 transition-colors"
                          />
                        </button>
                      </li>
                    );
                  })
                : props.otherFiles.flatMap(({ task, artifacts }) =>
                    artifacts.map((artifact) => {
                      const Icon = getIcon(artifact.type);
                      return (
                        <li key={`${task.id}-${artifact.id}`}>
                          <button
                            type="button"
                            onClick={() =>
                              props.onOpenTask?.(task.id, artifact)
                            }
                            class="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50/80 active:bg-indigo-50/50 transition-colors group"
                          >
                            <div class="flex-shrink-0 p-2 rounded-xl bg-slate-50 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                              <Icon size={20} />
                            </div>
                            <div class="flex-1 min-w-0">
                              <p class="font-bold text-slate-900 truncate">
                                {artifact.title}
                              </p>
                              <p class="text-xs text-slate-400 mt-0.5 truncate">
                                {task.title}
                              </p>
                            </div>
                            <ChevronRight
                              size={18}
                              class="flex-shrink-0 text-slate-300 group-hover:text-indigo-500 transition-colors"
                            />
                          </button>
                        </li>
                      );
                    }),
                  )}
            </ul>
          </section>
        )}

        {!props.dailySummary &&
          props.flatSortedFiles.length === 0 &&
          props.otherFiles.length === 0 && (
            <div class="py-16 text-center text-slate-400 text-sm font-medium">
              {t('artifact.noAttachments')}
            </div>
          )}
      </div>
    );
  },
});
