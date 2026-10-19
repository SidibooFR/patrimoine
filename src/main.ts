import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import "@fontsource-variable/roboto";
import "@material/web/all.js";
import "./style.css";
import { applyCachedAppearance } from "./lib/appearance";

applyCachedAppearance();

createApp(App).use(router).mount("#app");
