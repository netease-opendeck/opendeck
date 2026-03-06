import { createApp } from 'vue';
import App from './App';
import router from './router';
import { i18n, setLocale } from './i18n';
import './index.css';

const app = createApp(App);
app.use(i18n);
app.use(router);
app.mount('#app');

const locale = i18n.global.locale.value as 'zh' | 'en';
setLocale(locale);
