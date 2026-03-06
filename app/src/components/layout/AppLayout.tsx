import { defineComponent, computed } from 'vue';
import { useRouter, useRoute, RouterView } from 'vue-router';
import Sidebar from './Sidebar';

export default defineComponent({
  name: 'AppLayout',
  setup() {
    const router = useRouter();
    const route = useRoute();

    const handleTabChange = (tab: string) => {
      const routes: Record<string, string> = {
        solutions: '/solutions',
        drive: '/drive',
        taskManagement: '/task-management',
      };
      if (routes[tab]) router.push(routes[tab]);
    };

    const activeTab = computed(() => {
      const path = route.path;
      if (path.startsWith('/task-management')) return 'taskManagement';
      if (path.startsWith('/drive')) return 'drive';
      if (path.startsWith('/solutions')) return 'solutions';
      return 'taskManagement';
    });

    return () => (
      <div class="flex h-screen w-full overflow-hidden bg-slate-50/50">
        <Sidebar activeTab={activeTab.value} onTab-change={handleTabChange} />
        <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
          <RouterView />
        </main>
      </div>
    );
  },
});
