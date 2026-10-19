import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import "@fontsource-variable/roboto";
import "@fortawesome/fontawesome-free/css/fontawesome.min.css";
import "@fortawesome/fontawesome-free/css/solid.min.css";
import "@material/web/all.js";
import "./style.css";
import { applyCachedAppearance } from "./lib/appearance";

applyCachedAppearance();

createApp(App).use(router).mount("#app");
