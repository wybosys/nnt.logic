<!-- @formatter:off -->
<html>
<head>
    <script type="text/javascript" src="http://develop.91egame.com/devops/cdn/provider/file/zepto.min.js"></script>
    <script type="text/javascript" src="http://develop.91egame.com/devops/cdn/provider/file/vue.min.js"></script>
    <link type="text/css" rel="stylesheet" href="http://develop.91egame.com/devops/cdn/provider/file/bootstrap.min.css"></link>
    <link type="text/css" rel="stylesheet" href="http://develop.91egame.com/devops/cdn/provider/file/bootstrap-vue.min.css"></link>
    <script type="text/javascript" src="http://develop.91egame.com/devops/cdn/provider/file/polyfill.min.js"></script>
    <script type="text/javascript"
            src="http://develop.91egame.com/devops/cdn/provider/file/bootstrap-vue.min.js"></script>
    <script type="text/javascript"
            src="http://develop.91egame.com/devops/cdn/provider/file/vue-json-tree-view.min.js"></script>
</head>

<!-- @formatter:off -->
<div id="app" class="container-fluid">
    <div class="row">
        <div class="col-md-2">
            <b-list-group v-for="info in actions">
                <b-list-group-item v-on:click="actSelectAction(info)">${info.name}</b-list-group-item>
            </b-list-group>
        </div>
        <div class="col-md-2">
            <div>${current}</div>
            <div v-if="action" style="text-align:right">${action.comment}<span style="color:red" v-if="action.needauth">登录</span>
            </div>
            <b-form @submit.prevent="actSubmit" v-if="current">
                <b-form-group v-for="param in inputs" :key="param.index" :label="param.name + ' ' + param.comment"
                              :description="param.desc">
                    <div v-if="param.file">
                        <b-form-file v-model="form[param.index]"></b-form-file>
                        <br>选择文件：${form[param.index] && form[param.index].name}
                        <div>
                            <b-button :field="param.index" @click="actRecordAudio">录音</b-button>
                            <b-button :field="param.index" @click="actPlayAudio">播放</b-button>
                        </div>
                    </div>
                    <b-form-radio-group v-model="form[param.index]" v-else-if="param.boolean">
                        <b-form-radio value="true">是</b-form-radio>
                        <b-form-radio value="false">否</b-form-radio>
                    </b-form-radio-group>
                    <div v-else-if="form.enum">
                        <b-dropdown text="选择枚举" class="m-md-2">
                            <b-dropdown-item v-for="(item, index) in enums[param.index]" :index="index"
                                             :field="field.id" :key="index" @click="actDropdown">
                                ${item.name}
                            </b-dropdown-item>
                        </b-dropdown>
                        <br>当前选择：${form_enums[param.index] && form_enums[param.index].name}
                    </div>
                    <b-form-input type="text" v-model="form[param.index]" v-else></b-form-input>
                </b-form-group>
                <b-button type="submit" variant="primary">提交</b-button>
                <b-button @click="actOpen">OPEN</b-button>
            </b-form>
        </div>
        <div class="col-md">
            <tree-view :data="outputs" v-show="outputs">
            </tree-view>
            <div v-show="log" v-html="log">
            </div>
        </div>
    </div>
</div>

<script>
  Vue.use(TreeView);
  new Vue({
    delimiters: ['${', '}'],
    el: '#app',
    data: {            
      actions: {{actions}},
      action: null,
      current: "",
      form: {},
      inputs: [],      
      outputs: null,
      log: null
    },
    methods: {
      actSelectAction(info) {        
        this.action = info;
        this.current = info.name;
        this.log = null;
        this.form = {};

        // 生成param的描述
        info.params.forEach(param => {
          let desc = [];
          let def = param.name;
          if (param.input) {
            if (param.optional)
              desc.push("输入");
            else
              desc.push("<span style='color:red'>输入</span>");
          }
          if (param.output)
            desc.push("输出");
          if (param.optional) {
            desc.push("可选");
            def += "?";
          }
          if (param.file) {
            desc.push("文件");
            def += ": File";
          }
          if (param.array) {
            def += ": " + param.valtyp + "[]";
          }
          if (param.map) {
            def += ": " + param.keytyp + " => " + param.valtyp;
          }
          if (param.object) {
            def += ": " + param.valtype;
          }
          if (param.integer) {
            def += ": integer";
          }
          if (param.double) {
            def += ": double";
          }
          if (param.string) {
            def += ": string";
          }
          if (param.boolean) {
            def += ": boolean";
          }
          param.def = def;
          param.desc = desc.join(' ');
        });        
        // 提取输入参数
        this.inputs = info.params.filter(e=>{
          return e.input;
        });
        this.outputs = info.params.filter(e=>{
          return e.output;
        }).map(e=>{
          return e.def;
        });
      },
      actDropdown() {

      },
      actSubmit() {        
        this.log = null;        
        let params = {}; // 普通参数
        let files = {}; // 文件参数
        for (let idx in this.inputs) {
          let input = this.inputs[idx];
          if (!(input.index in this.form)) {
            if (!input.optional) {
              alert("没有设置参数 " + input.name);
              return;
            }
            else
              continue;
          }
          if (input.file)
            files[input.name] = this.form[input.index];
          else
            params[input.name] = this.form[input.index];
        }
        if (localStorage.getItem('::nnt::logic::sid'))
            params['_sid'] = localStorage.getItem('::nnt::logic::sid');
        params['_skippermission'] = 1;
        // 请求数据
        let url = location.href.replace('action=api.doc', 'action=' + this.action.action);
        if (Object.keys(params).length)
          url += '&' + $.param(params);
        // 如果存在文件，则强制为post
        if (Object.keys(files).length) {
          Post(url, files, (err, resp)=>{
            if (err) {
              this.outputs = null;
              this.log = err.message;
            }
            else {
                this.outputs = resp.data;
            }
          });
        }
        else {
          Get(url, (err, resp)=>{
            if (err) {
              this.outputs = null;
              this.log = err.message;
            }
            else {
                this.outputs = resp.data;
            }
          });
        }
      },
      actOpen() {
        let params = {}; // 普通参数
        for (let idx in this.inputs) {
          let input = this.inputs[idx];
          if (!(input.index in this.form)) {
            if (!input.optional) {
              alert("没有设置参数 " + input.name);
              return;
            }
            else
              continue;
          }
            params[input.name] = this.form[input.index];
        }
        if (localStorage.getItem('::nnt::logic::sid'))
            params['_sid'] = localStorage.getItem('::nnt::logic::sid');
        params['_skippermission'] = 1;
        // 请求数据
        let url = location.href.replace('action=api.doc', 'action=' + this.action.action);
        if (Object.keys(params).length)
          url += '&' + $.param(params);
        window.open(url);
      },
      actRecordAudio() {
      },
      actPlayAudio() {
      }
    },
  });

  function Get(url, cb) {
    var hdl = new XMLHttpRequest();
    hdl.onreadystatechange = function (e) {
        ProcessRequest(hdl, e, cb);
    };
    hdl.open("GET", url, true);
    hdl.send(null);
  }
  function Post(url, files, cb) {
      var data = new FormData();
      for (var k in files)
        data.append(k, files[k]);
      var hdl = new XMLHttpRequest();
      hdl.onreadystatechange = function (e) {
          ProcessRequest(hdl, e, cb);
      };
      hdl.open("POST", url, true);
      hdl.send(data);
  }
  var SUCCESS = [200];
  function ProcessRequest(hdl, ev, cb) {
      switch (hdl.readyState) {
          case XMLHttpRequest.DONE:
              {
                  if (SUCCESS.indexOf(hdl.status) == -1) {
                      cb(new Error("请求失败 " + hdl.status), null);
                      return;
                  }
                  var ct = hdl.getResponseHeader("content-type");
                  if (ct != "application/json") {
                      cb(new Error(hdl.responseText));
                      return;
                  }
                  try {
                    var jsd = JSON.parse(hdl.responseText);
                    cb(null, {'status':hdl.status, 'data':jsd});
                    // 判断是否含有登陆信息
                    var sid = hdl.getResponseHeader("X-NntLogic-SessionId");
                    if (sid) {
                        localStorage.setItem('::nnt::logic::sid', sid);
                    }
                  }
                  catch (e) {
                    cb(new Error(hdl.responseText));
                  }
              }
              break;
      }
  }

  //# sourceURL=apidoc.js
</script>
</html>
