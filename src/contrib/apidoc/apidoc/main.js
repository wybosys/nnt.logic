import Vue from 'vue'
import App from './App.vue'
import BootstrapVue from "bootstrap-vue"
import 'bootstrap-vue/dist/bootstrap-vue.css'
import 'bootstrap/dist/css/bootstrap.css'
import TreeView from "vue-json-tree-view"

Vue.use(BootstrapVue);
Vue.use(TreeView);

new Vue({
  el: '#app',
  render: h => h(App)
})
