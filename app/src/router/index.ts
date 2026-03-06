import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/solutions' },
    {
      path: '/solutions',
      name: 'solutions',
      component: () => import('@/views/SolutionsView'),
    },
    {
      path: '/drive',
      name: 'drive',
      component: () => import('@/views/DriveView'),
    },
    {
      path: '/task-management',
      name: 'task-management',
      component: () => import('@/views/TaskManagementView'),
    },
  ],
});

export default router;
