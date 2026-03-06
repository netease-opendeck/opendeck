import { defineComponent } from 'vue';
import AppLayout from './components/layout/AppLayout';

export default defineComponent({
  name: 'App',
  setup() {
    return () => <AppLayout />;
  },
});
