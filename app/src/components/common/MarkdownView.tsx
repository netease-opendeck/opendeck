import { defineComponent, computed } from 'vue';
import { marked } from 'marked';

export default defineComponent({
  name: 'MarkdownView',
  props: {
    source: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const html = computed(() =>
      marked.parse(props.source ?? ''),
    );

    return () => (
      <div
        class="markdown-view prose prose-slate max-w-none text-slate-600 text-sm leading-relaxed"
        // doc 内容来自受控后端 SKILL.md，这里信任其安全性
        v-html={html.value as string}
      />
    );
  },
});

