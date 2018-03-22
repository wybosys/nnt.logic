<template>
    <div id="drawque">
        <svg ref="draw"
             :class='["draw", drawing && "drawing"]' v-on:mousedown="onDrawMouseDown"
             v-on:mouseup="onDrawMouseUp" v-on:mousemove="onDrawMouseMove"
             xmlns="http://www.w3.org/2000/svg">
        </svg>
        <svg ref="present" class="draw"
             xmlns="http://www.w3.org/2000/svg"></svg>
        <button @click="onUndo">撤销</button>
        <button @click="onClean">清空</button>
    </div>
</template>

<script>
    import {Session} from "../../../../src/nnt/sdk/client/dist/session"
    import {RestSession} from "../../../../src/nnt/sdk/client/dist/restsession"
    import {ImSession} from "../../../../src/nnt/sdk/client/dist/imsession"
    import {timestamp} from "../../../../src/nnt/sdk/client/dist/utils"
    import {models, routers, api} from "../../../../bin/contrib/manager/api/api"

    export default {
        name: "drawque",
        data() {
            return {
                drawing: false,
                ele: api.DrawqueAdd(),
                time: 0,
                cur: null
            }
        },
        created() {
            // 使用huliha登陆
            new RestSession().setAsDefault();
            let m = api.UserLogin();
            m.account = "huliha";
            m.password = "123";
            Session.Fetch(m, m => {
                Session.SID = m.sid;
                // 申请画布
                m = api.DrawqueAcquire();
                m.tid = "drawque";
                m.iid = "default";
                Session.Fetch(m, m => {
                    let fid = m.fid;
                    // 监听IM消息
                    new ImSession().listen(new models.Messages(), (m) => {
                        m.items.forEach((e) => {
                            if (e.type == models.ImMsgType.GAME) {
                                let pl = e.payload;
                                if (pl.channel == "drawque.elements.changed" && pl.fid == fid) {
                                    if (pl.element) {
                                        let svg = this.$refs.present;
                                        let elm = pl.element;
                                        let path = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
                                        path.setAttribute("class", "present");
                                        path.setAttributeNS(null, "points", elm.points);
                                        path.setAttributeNS(null, "stroke", elm.state.color);
                                        path.setAttributeNS(null, "stroke-width", elm.state.line);
                                        path.setAttributeNS(null, "fill", "none");
                                        svg.appendChild(path);
                                    }
                                    else if (pl.undos) {
                                        console.log("撤销" + pl.undos + "步");

                                        let dra = this.$refs.draw;
                                        let prs = this.$refs.present;
                                        for (let i = 0; i < pl.undos; ++i) {
                                            dra.children[dra.children.length - 1].remove();
                                            prs.children[prs.children.length - 1].remove();
                                        }
                                    }
                                }
                            }
                        });
                    });

                    let state = new models.DrawQueState();
                    state.color = "black";
                    state.penid = 1;
                    state.line = 1;
                    this.ele.state = state;
                    this.ele.points = [];
                    this.ele.method = 1; // post
                    this.ele.tid = m.tid;
                    this.ele.iid = m.iid;
                    this.ele.fid = fid;
                });
            });
        },
        methods: {
            onDrawMouseDown(e) {
                if (this.drawing)
                    return;
                this.drawing = true;
                this.time = timestamp();
                let x = e.offsetX, y = e.offsetY;
                this.ele.points.push(x, y);
                let svg = this.$refs.draw;
                let path = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
                path.setAttributeNS(null, "points", x + "," + y);
                path.setAttributeNS(null, "stroke", this.ele.state.color);
                path.setAttributeNS(null, "stroke-width", this.ele.state.line);
                path.setAttributeNS(null, "fill", "none");
                this.cur = path.getAttributeNodeNS(null, "points");
                svg.appendChild(path);
            },
            onDrawMouseUp(e) {
                if (!this.drawing)
                    return;
                if (!this.ele.points.length)
                    return;
                this.ele.duration = timestamp() - this.time;
                // 提交服务器
                Session.Fetch(this.ele, m => {
                    // 开始下一轮
                    m.points.length = 0;
                    this.drawing = false;
                });
            },
            onDrawMouseMove(e) {
                if (!this.drawing)
                    return;
                let x = e.offsetX, y = e.offsetY;
                this.ele.points.push(x, y);
                this.cur.value += "," + x + "," + y;
            },
            onUndo() {
                let m = api.DrawqueUndo();
                m.tid = "drawque";
                m.iid = "default";
                m.fid = this.ele.fid;
                m.steps = 1;
                Session.Fetch(m, ()=>{});
            },
            onClean() {
                let m = api.DrawqueUndo();
                m.tid = "drawque";
                m.iid = "default";
                m.fid = this.ele.fid;
                Session.Fetch(m, ()=>{});
            }
        }
    }
</script>

<style>
    .draw {
        width: 800px;
        height: 400px;
        border: 1px solid #eeeeee;
        margin-bottom: 5px;
    }

    .drawing {
        border: 1px solid red;
    }

    .present {
        stroke-dasharray: 1000;
        stroke-dashoffset: 1000;
        -webkit-animation: dash 3s linear 1;
        animation: dash 3s linear 1;
        -webkit-animation-fill-mode: forwards;
        animation-fill-mode: forwards;
    }

    @-webkit-keyframes dash {
        to {
            stroke-dashoffset: 0;
        }
    }

    @keyframes dash {
        to {
            stroke-dashoffset: 0;
        }
    }
</style>