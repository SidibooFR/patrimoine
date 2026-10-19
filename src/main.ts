import { createApp } from "vue";
import VueApexCharts from "vue3-apexcharts";
import App from "./App.vue";
import { router } from "./router";
import "@fontsource-variable/roboto";
import "@material/web/all.js";
import "./style.css";
import { applyCachedAppearance } from "./lib/appearance";

applyCachedAppearance();

createApp(App).use(router).use(VueApexCharts).mount("#app");
