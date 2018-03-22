<template>
    <div id="apidoc" class="container-fluid">
        <div class="row">
            <div class="col-md-2" id="routerspanel">
                <div class="list-group">
                    <button v-for="router in routers" type="button" class="list-group-item"
                            v-on:click="actRouteClicked(router)">{{router}}
                    </button>
                </div>
            </div>
            <div class="col-md-2">
                <div>{{routerName}}</div>
                <b-form @submit="actSubmit" v-if="routerName">
                    <b-form-group v-for="field in inputs" :key="field.id" :label="field.name + ' ' + field.comment"
                                  :description="field.desc">
                        <div v-if="field.file">
                            <b-form-file v-model="form[field.id]"></b-form-file>
                            <br>选择文件：{{form[field.id] && form[field.id].name}}
                            <div>
                                <b-button :field="field.id" @click="actRecordAudio">录音</b-button>
                                <b-button :field="field.id" @click="actPlayAudio">播放</b-button>
                            </div>
                        </div>
                        <b-form-radio-group v-model="form[field.id]" v-else-if="field.bool">
                            <b-form-radio value="true">是</b-form-radio>
                            <b-form-radio value="false">否</b-form-radio>
                        </b-form-radio-group>
                        <div v-else-if="field.enum">
                            <b-dropdown text="选择枚举" class="m-md-2">
                                <b-dropdown-item v-for="(item, index) in enums[field.id]" :index="index"
                                                 :field="field.id"
                                                 :key="index"
                                                 @click="actDropdown">
                                    {{item.name}}
                                </b-dropdown-item>
                            </b-dropdown>
                            <br>当前选择：{{form_enums[field.id] && form_enums[field.id].name}}
                        </div>
                        <b-form-input type="text" v-model="form[field.id]" v-else></b-form-input>
                    </b-form-group>
                    <b-button type="submit" variant="primary">提交</b-button>
                </b-form>
            </div>
            <div class="col-md">
                <tree-view :data="outputs">
                </tree-view>
                <div style="float:right;">
                    <b-button v-show="showLogin" @click="actWeixinLogin">微信登陆</b-button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import {AudioRecorder} from "../../../../src/nnt/sdk/client/dist/media"
    import {Session} from "../../../../src/nnt/sdk/client/dist/session"
    import {Decode, GetFieldOptions, Output} from "../../../../src/nnt/sdk/client/dist/model"
    import {RestSession} from "../../../../src/nnt/sdk/client/dist/restsession"
    import {AuthContent, LoginContent} from "../../../../src/nnt/sdk/client/dist/service"
    import {Services} from "../../../../src/nnt/sdk/client/dist/services"
    import {ImSession} from "../../../../src/nnt/sdk/client/dist/imsession"
    import {Page} from "../../../nnt/sdk/client/dist/session"
    import {api, models, routers} from "../../../../bin/contrib/apidoc/api/api"

    export default {
        name: "appdoc",
        data() {
            return {
                routers: [],
                routerName: "",
                routerClazz: null,
                inputs: [],
                outputvalue: " ",
                outputs: {},
                form: {},
                form_enums: {},
                enums: {},
                showLogin: false
            }
        },
        mounted() {
            let routerspanel = this.$el.querySelector('#routerspanel');
            this.$nextTick(() => {
                routerspanel.style.maxHeight = window.innerHeight + "px";
            });
        },
        created() {
            Session.SID = localStorage.getItem("::apidoc::sid");
            // 设置rest为默认的通讯通道
            new RestSession().setAsDefault();
            //new SocketSession().setAsDefault();
            for (let k in routers) {
                this.routers.push(k);
            }
            // 监听IM消息
            new ImSession().listen(new models.Messages(), m => {
                m.items.forEach((e) => {
                    console.log("收到从 " + e.fromi.user + "@" + e.fromi.domain + " 发来的消息：" + JSON.stringify(e.payload));
                });
            }, err => {
                alert(err.message);
            });

            // 登陆SDK
            Services.Launch(info => {
                if (info.uid) {
                    // 清除之前的
                    Session.SID = null;

                    // 使用UID自动登陆
                    let m = api.UserLogin();
                    m.uid = info.uid;
                    Session.Fetch(m, m => {
                        // 登陆sdk
                        let cnt = new LoginContent();
                        cnt.uid = m.uid;
                        Services.Fetch(cnt, () => {
                            alert("第三方登陆成功");
                        });

                        Session.SID = m.sid;
                        localStorage.setItem("::apidoc::sid", m.sid);
                    });
                }
            });
        },
        methods: {
            actRouteClicked(router) {
                let r = routers[router];
                this.routerName = r[0] + " " + r[2];
                this.showLogin = r[0] == "user.login";
                this.routerClazz = api[router];
                this.inputs.length = 0;
                this.outputs = {};
                this.form = {};
                let clz = r[1];
                let fps = GetFieldOptions(new clz());
                for (let k in fps) {
                    let fp = fps[k];
                    if (fp.input) {
                        let desc = [];
                        if (fp.input) {
                            if (fp.optional)
                                desc.push("输入");
                            else
                                desc.push("<span style='color:red'>输入</span>");
                        }
                        if (fp.output)
                            desc.push("输出");
                        if (fp.optional)
                            desc.push("可选");
                        if (fp.file)
                            desc.push("文件");
                        this.inputs.push({
                            id: fp.id,
                            name: k,
                            file: fp.file,
                            enum: fp.enum,
                            array: fp.array,
                            bool: fp.boolean,
                            desc: desc.join(" "),
                            comment: fp.comment ? fp.comment : ""
                        });
                        // 如果是枚举，则需要生成对应的枚举数据
                        if (fp.enum) {
                            let ems = [];
                            // 枚举对象的值编译后变成普通对象的每一个静态成员变量
                            for (let key in fp.valtype) {
                                let val = fp.valtype[key];
                                if (typeof(val) == "number")
                                    ems.push({
                                        name: key,
                                        value: fp.valtype[key]
                                    });
                            }
                            this.enums[fp.id] = ems;
                        }
                    }
                    if (fp.output) {
                        this.collectOutput(fp, k, this.outputs);
                    }
                }
            },
            collectOutput(fp, k, outputs) {
                if (fp.valtype) {
                    if (typeof(fp.valtype) == "string" || fp.enum) {
                        this.doCollectOutput(fp, k, outputs);
                    }
                    else {
                        let fps = GetFieldOptions(new fp.valtype());
                        let tmp = {};
                        for (let k in fps) {
                            let fp = fps[k];
                            if (!fp.output)
                                continue;
                            this.collectOutput(fp, k, tmp);
                        }
                        outputs[k] = tmp;
                    }
                }
                else {
                    this.doCollectOutput(fp, k, outputs);
                }
            },
            doCollectOutput(fp, k, outputs) {
                outputs[k] = fp.comment;
            },
            actSubmit(e) {
                e.preventDefault();
                let tmp = new this.routerClazz();
                // 把form中的值挨个填入tmp中
                let params = {};
                for (let k in this.form) {
                    k = parseInt(k);
                    let v = this.form[k];
                    if (v == null || v === "")
                        continue;
                    let fp = this.inputs.find(e => {
                        return e.id == k;
                    });
                    if (fp.array)
                        params[fp.name] = v.split(",");
                    else
                        params[fp.name] = v;
                }
                Decode(tmp, params);
                if (this.sid)
                    Session.SID = this.sid;
                if (tmp instanceof models.Paged) {
                    Session.Page(tmp, () => {
                        let res = Output(tmp);
                        this.outputs = res;
                    }, err => {
                        this.outputs = {code: tmp.code};
                    });
                }
                else {
                    Session.Fetch(tmp, () => {
                        if (tmp instanceof models.LoginInfo && tmp.sid) {
                            Session.SID = tmp.sid;
                            localStorage.setItem("::apidoc::sid", tmp.sid);
                        }
                        let res = Output(tmp);
                        this.outputs = res;
                    }, err => {
                        this.outputs = {code: tmp.code};
                    });
                }
            },
            actDropdown(e) {
                let tgt = e.target;
                let fid = tgt.getAttribute("field");
                let idx = tgt.getAttribute("index");
                let em = this.enums[fid][idx];
                this.form[fid] = em.value;
                this.form_enums[fid] = em;
                this.$forceUpdate();
            },
            actRecordAudio(e) {
                let tgt = e.target;
                let fid = tgt.getAttribute("field");
                let rcd = this.form[fid];
                if (rcd && rcd.recording) {
                    tgt.textContent = "录音";
                    rcd.stop();
                    return;
                }
                tgt.textContent = "停止";
                rcd = new AudioRecorder();
                rcd.start();
                this.form[fid] = rcd;
            },
            actPlayAudio(e) {
                let tgt = e.target;
                let fid = tgt.getAttribute("field");
                let rcd = this.form[fid];
                if (!rcd) {
                    alert("没有录音，不能播放");
                    return;
                }
                rcd.play();
            },
            actWeixinLogin() {
                // 微信登陆
                let auth = new AuthContent();
                auth.method = 0x21; // 微信扫码登陆
                Services.Fetch(auth, auth => {
                    if (auth.targeturl) {
                        location.href = auth.targeturl;
                    }
                });
            }
        }
    }
</script>

<style>
    #routerspanel {
        overflow-y: auto;
    }
</style>
